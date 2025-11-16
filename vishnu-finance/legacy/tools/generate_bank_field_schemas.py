"""
Generate per-bank field schemas from parser implementations.

This script inspects the parser classes under ``tools/parsers`` and emits
JSON schema files (one per bank code) that list the transaction and metadata
fields the parser can produce. It also writes an index helper for the
frontend at ``src/data/bankFieldSchemas.ts`` so the admin portal can import
the schemas directly.

Run from the repository root:

    python tools/generate_bank_field_schemas.py
"""

from __future__ import annotations

import ast
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set


REPO_ROOT = Path(__file__).resolve().parents[1]
PARSERS_DIR = REPO_ROOT / "tools" / "parsers"
OUTPUT_DIR = REPO_ROOT / "src" / "data" / "bank-field-schemas"
INDEX_FILE = REPO_ROOT / "src" / "data" / "bankFieldSchemas.ts"

DEFAULT_TRANSACTION_FIELDS: Set[str] = {
    "amount",
    "balance",
    "bankCode",
    "credit",
    "date",
    "date_iso",
    "debit",
    "description",
    "line",
    "page",
    "raw",
    "store",
    "commodity",
}

STATEMENT_METADATA_FIELDS: Set[str] = {
    "accountHolderName",
    "accountNumber",
    "branch",
    "closingBalance",
    "ifsc",
    "openingBalance",
    "statementEndDate",
    "statementStartDate",
    "totalCredits",
    "totalDebits",
    "transactionCount",
}

EXCLUDED_TRANSACTION_FIELDS: Set[str] = {"type"}

FIELD_NAME_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


@dataclass
class ParserInfo:
    class_name: str
    file_path: Path
    bank_codes: Set[str] = field(default_factory=set)
    alias_map: Dict[str, List[str]] = field(default_factory=dict)
    transaction_fields: Set[str] = field(default_factory=set)
    metadata_fields: Set[str] = field(default_factory=set)


class DictKeyCollector(ast.NodeVisitor):
    """Collect literal dictionary keys within class methods."""

    def __init__(self) -> None:
        self._function_stack: List[str] = []
        self.transaction_keys: Set[str] = set()
        self.metadata_keys: Set[str] = set()

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self._function_stack.append(node.name)
        self.generic_visit(node)
        self._function_stack.pop()

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._function_stack.append(node.name)
        self.generic_visit(node)
        self._function_stack.pop()

    def visit_Dict(self, node: ast.Dict) -> None:
        if not self._function_stack:
            self.generic_visit(node)
            return

        keys = []
        for key_node in node.keys:
            if isinstance(key_node, ast.Constant) and isinstance(key_node.value, str):
                key_value = key_node.value.strip()
                if FIELD_NAME_PATTERN.match(key_value):
                    keys.append(key_value)

        if keys:
            if any("metadata" in name.lower() for name in self._function_stack):
                self.metadata_keys.update(keys)
            else:
                self.transaction_keys.update(keys)

        self.generic_visit(node)


def get_class_bases(node: ast.ClassDef) -> List[str]:
    bases: List[str] = []
    for base in node.bases:
        if isinstance(base, ast.Name):
            bases.append(base.id)
        elif isinstance(base, ast.Attribute):
            bases.append(base.attr)
    return bases


def extract_bank_codes_from_init(node: ast.ClassDef) -> Set[str]:
    codes: Set[str] = set()
    for stmt in node.body:
        if isinstance(stmt, ast.FunctionDef) and stmt.name == "__init__":
            for sub in ast.walk(stmt):
                if isinstance(sub, ast.Call):
                    func = sub.func
                    if (
                        isinstance(func, ast.Attribute)
                        and func.attr == "__init__"
                        and isinstance(func.value, ast.Call)
                        and isinstance(func.value.func, ast.Name)
                        and func.value.func.id == "super"
                    ):
                        if sub.args and isinstance(sub.args[0], ast.Constant) and isinstance(sub.args[0].value, str):
                            codes.add(sub.args[0].value.strip().upper())
    return codes


def extract_alias_map(node: ast.ClassDef) -> Dict[str, List[str]]:
    alias_map: Dict[str, List[str]] = {}
    for stmt in node.body:
        if isinstance(stmt, ast.Assign):
            for target in stmt.targets:
                if isinstance(target, ast.Name) and target.id == "BANK_CODES":
                    try:
                        literal_value = ast.literal_eval(stmt.value)
                    except Exception:
                        literal_value = None
                    if isinstance(literal_value, dict):
                        for key, value in literal_value.items():
                            if isinstance(key, str):
                                aliases: List[str] = []
                                if isinstance(value, (list, tuple)):
                                    for item in value:
                                        if isinstance(item, str):
                                            aliases.append(item.strip().upper())
                                alias_map[key.strip().upper()] = aliases
    return alias_map


def extract_parser_info(file_path: Path) -> List[ParserInfo]:
    with file_path.open("r", encoding="utf-8") as source:
        tree = ast.parse(source.read(), filename=str(file_path))

    infos: List[ParserInfo] = []

    for node in tree.body:
        if not isinstance(node, ast.ClassDef):
            continue

        bases = get_class_bases(node)
        if "BaseBankParser" not in bases:
            continue

        info = ParserInfo(class_name=node.name, file_path=file_path)
        info.bank_codes.update(extract_bank_codes_from_init(node))
        info.alias_map.update(extract_alias_map(node))

        collector = DictKeyCollector()
        for stmt in node.body:
            collector.visit(stmt)

        info.transaction_fields.update(collector.transaction_keys)
        info.metadata_fields.update(collector.metadata_keys)
        infos.append(info)

    return infos


def merge_parser_infos(parser_infos: Iterable[ParserInfo]) -> Dict[str, Dict[str, Set[str]]]:
    schemas: Dict[str, Dict[str, Set[str]]] = {}

    for info in parser_infos:
        if info.alias_map:
            bank_code_iterable = info.alias_map.keys()
        else:
            bank_code_iterable = info.bank_codes or set()

        for bank_code in bank_code_iterable:
            canonical_code = bank_code.strip().upper()
            if canonical_code not in schemas:
                schemas[canonical_code] = {
                    "parserClasses": set(),
                    "parserFiles": set(),
                    "transactionFields": set(),
                    "metadataFields": set(),
                    "aliases": set(),
                }

            schema_entry = schemas[canonical_code]
            schema_entry["parserClasses"].add(info.class_name)
            schema_entry["parserFiles"].add(str(info.file_path.relative_to(REPO_ROOT).as_posix()))
            schema_entry["transactionFields"].update(info.transaction_fields)
            schema_entry["metadataFields"].update(info.metadata_fields)

            if info.alias_map:
                aliases = set(info.alias_map.get(bank_code, []))
                aliases.discard(canonical_code)
                schema_entry["aliases"].update(aliases)

    return schemas


def write_json_schemas(schemas: Dict[str, Dict[str, Set[str]]]) -> List[str]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    written_codes: List[str] = []

    for bank_code in sorted(schemas.keys()):
        entry = schemas[bank_code]
        transaction_fields = DEFAULT_TRANSACTION_FIELDS.union(entry["transactionFields"])
        transaction_fields.difference_update(EXCLUDED_TRANSACTION_FIELDS)
        schema_payload = {
            "bankCode": bank_code,
            "parserClasses": sorted(entry["parserClasses"]),
            "parserFiles": sorted(entry["parserFiles"]),
            "aliases": sorted(entry["aliases"]),
            "transactionFields": sorted(transaction_fields),
            "metadataFields": sorted(entry["metadataFields"]),
            "statementMetadataFields": sorted(STATEMENT_METADATA_FIELDS),
        }

        output_path = OUTPUT_DIR / f"{bank_code}.json"
        with output_path.open("w", encoding="utf-8") as handle:
            json.dump(schema_payload, handle, indent=2, ensure_ascii=False)
            handle.write("\n")

        written_codes.append(bank_code)

    return written_codes


def write_index_file(bank_codes: List[str]) -> None:
    imports: List[str] = []
    array_entries: List[str] = []

    for bank_code in bank_codes:
        identifier = re.sub(r"[^0-9A-Za-z_]", "_", bank_code)
        imports.append(f"import {identifier}Schema from './bank-field-schemas/{bank_code}.json';")
        array_entries.append(f"  {identifier}Schema as BankFieldSchema")

    imports_block = "\n".join(imports)
    array_block = ",\n".join(array_entries)

    index_contents = (
        "// Auto-generated by tools/generate_bank_field_schemas.py. Do not edit manually.\n\n"
        "export type BankFieldSchema = {\n"
        "  bankCode: string;\n"
        "  parserClasses: string[];\n"
        "  parserFiles: string[];\n"
        "  aliases: string[];\n"
        "  transactionFields: string[];\n"
        "  metadataFields: string[];\n"
        "  statementMetadataFields: string[];\n"
        "};\n\n"
        f"{imports_block}\n\n"
        "export const bankFieldSchemas: BankFieldSchema[] = [\n"
        f"{array_block}\n"
        "];\n\n"
        "export const bankFieldSchemaMap: Record<string, BankFieldSchema> = Object.fromEntries(\n"
        "  bankFieldSchemas.map((schema) => [schema.bankCode, schema])\n"
        ");\n"
    )

    INDEX_FILE.parent.mkdir(parents=True, exist_ok=True)
    with INDEX_FILE.open("w", encoding="utf-8") as handle:
        handle.write(index_contents)


def main() -> None:
    parser_files = sorted(PARSERS_DIR.glob("*.py"))
    parser_infos: List[ParserInfo] = []

    for file_path in parser_files:
        if file_path.name == "__init__.py":
            continue
        parser_infos.extend(extract_parser_info(file_path))

    schemas = merge_parser_infos(parser_infos)
    bank_codes = write_json_schemas(schemas)
    write_index_file(bank_codes)

    print(
        f"Generated schemas for {len(bank_codes)} bank(s): "
        + ", ".join(bank_codes)
    )


if __name__ == "__main__":
    main()

