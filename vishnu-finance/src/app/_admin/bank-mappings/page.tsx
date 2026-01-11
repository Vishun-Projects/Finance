"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bankFieldSchemas, bankFieldSchemaMap, type BankFieldSchema } from "@/data/bankFieldSchemas";
import { Copy, RefreshCw, Plus, Save, Search, Trash2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

type BankFieldMapping = {
  id: string;
  bankCode: string;
  fieldKey: string;
  mappedTo: string;
  description?: string | null;
  version: number;
  isActive: boolean;
  mappingConfig?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; email: string | null; name: string | null } | null;
};

export default function AdminBankMappingsPage() {
  const { success, error: showError } = useToast();
  const [mappings, setMappings] = useState<BankFieldMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [bankFilter, setBankFilter] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    bankCode: "",
    fieldKey: "",
    mappedTo: "",
    description: "",
    mappingConfig: "",
  });
  const [selectedBankCode, setSelectedBankCode] = useState(() => bankFieldSchemas[0]?.bankCode ?? "");
  const [fieldFilter, setFieldFilter] = useState("");

  const fetchMappings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (bankFilter) params.set("bankCode", bankFilter);
      if (includeInactive) params.set("includeInactive", "true");

      const response = await fetch(`/api/admin/bank-field-mappings?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load mappings");
      }
      const data = await response.json();
      setMappings(data.mappings || []);
    } catch (error) {
      console.error("Bank mapping fetch failed:", error);
      showError("Error", "Unable to load bank field mappings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMappings = useMemo(() => mappings, [mappings]);

  const selectedSchema: BankFieldSchema | null = useMemo(() => {
    if (!selectedBankCode) return null;
    return bankFieldSchemaMap[selectedBankCode] ?? null;
  }, [selectedBankCode]);

  const filterQuery = fieldFilter.trim().toLowerCase();

  const filteredTransactionFields = useMemo(() => {
    if (!selectedSchema) return [];
    if (!filterQuery) return selectedSchema.transactionFields;
    return selectedSchema.transactionFields.filter(field => field.toLowerCase().includes(filterQuery));
  }, [selectedSchema, filterQuery]);

  const filteredMetadataFields = useMemo(() => {
    if (!selectedSchema) return [];
    if (!filterQuery) return selectedSchema.metadataFields;
    return selectedSchema.metadataFields.filter(field => field.toLowerCase().includes(filterQuery));
  }, [selectedSchema, filterQuery]);

  const filteredStatementFields = useMemo(() => {
    if (!selectedSchema) return [];
    if (!filterQuery) return selectedSchema.statementMetadataFields;
    return selectedSchema.statementMetadataFields.filter(field => field.toLowerCase().includes(filterQuery));
  }, [selectedSchema, filterQuery]);

  const handleSubmit = async () => {
    if (!form.bankCode || !form.fieldKey || !form.mappedTo) {
      showError("Validation", "Bank code, field key, and mapped field are required.");
      return;
    }

    let parsedConfig: Record<string, unknown> | undefined;
    if (form.mappingConfig.trim()) {
      try {
        parsedConfig = JSON.parse(form.mappingConfig);
      } catch {
        showError("Invalid JSON", "Mapping configuration must be valid JSON.");
        return;
      }
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/bank-field-mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankCode: form.bankCode.trim(),
          fieldKey: form.fieldKey.trim(),
          mappedTo: form.mappedTo.trim(),
          description: form.description.trim() || null,
          mappingConfig: parsedConfig,
        }),
      });

      if (!response.ok) {
        throw new Error("Creation failed");
      }

      const data = await response.json();
      setMappings(prev => [data.mapping, ...prev]);
      success("Saved", "Field mapping created.");
      setForm({
        bankCode: "",
        fieldKey: "",
        mappedTo: "",
        description: "",
        mappingConfig: "",
      });
    } catch (error) {
      console.error("Create mapping error:", error);
      showError("Error", "Failed to create mapping.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopySchema = async () => {
    if (!selectedSchema) {
      showError("Unavailable", "Select a bank to copy its schema.");
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(selectedSchema, null, 2));
      success("Copied", `${selectedSchema.bankCode} schema copied to clipboard.`);
    } catch (error) {
      console.error("Copy schema error:", error);
      showError("Error", "Failed to copy schema to clipboard.");
    }
  };

  const renderFieldBadges = (fields: string[], emptyLabel: string) => {
    if (fields.length === 0) {
      return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
    }

    return (
      <div className="flex flex-wrap gap-2">
        {fields.map(field => (
          <Badge key={field} variant="outline">
            {field}
          </Badge>
        ))}
      </div>
    );
  };

  const toggleActive = async (mapping: BankFieldMapping) => {
    try {
      const response = await fetch(`/api/admin/bank-field-mappings/${mapping.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !mapping.isActive }),
      });

      if (!response.ok) {
        throw new Error("Update failed");
      }

      const data = await response.json();
      setMappings(prev => prev.map(item => (item.id === mapping.id ? data.mapping : item)));
      success("Updated", `Mapping ${!mapping.isActive ? "activated" : "deactivated"}.`);
    } catch (error) {
      console.error("Toggle mapping error:", error);
      showError("Error", "Failed to update mapping.");
    }
  };

  const deleteMapping = async (mapping: BankFieldMapping) => {
    if (!confirm(`Delete mapping for ${mapping.bankCode} / ${mapping.fieldKey}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/bank-field-mappings/${mapping.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setMappings(prev => prev.filter(item => item.id !== mapping.id));
      success("Deleted", "Field mapping removed.");
    } catch (error) {
      console.error("Delete mapping error:", error);
      showError("Error", "Failed to delete mapping.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <span>Create Bank Mapping</span>
          </CardTitle>
          <CardDescription>
            Define how parsed fields map to internal transaction schema for each bank.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bank-code">Bank Code</Label>
              <Input
                id="bank-code"
                value={form.bankCode}
                onChange={e => setForm(prev => ({ ...prev, bankCode: e.target.value.toUpperCase() }))}
                placeholder="e.g. HDFC, SBIN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="source-field">Source Field Key</Label>
              <Input
                id="source-field"
                value={form.fieldKey}
                onChange={e => setForm(prev => ({ ...prev, fieldKey: e.target.value }))}
                placeholder="e.g. date_iso"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapped-field">Mapped To</Label>
              <Input
                id="mapped-field"
                value={form.mappedTo}
                onChange={e => setForm(prev => ({ ...prev, mappedTo: e.target.value }))}
                placeholder="e.g. transactionDate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mapping-description">Description</Label>
              <Input
                id="mapping-description"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="mapping-config">Mapping Config (JSON)</Label>
              <Textarea
                id="mapping-config"
                rows={4}
                placeholder='e.g. { "parseFormat": "DD/MM/YYYY" }'
                value={form.mappingConfig}
                onChange={e => setForm(prev => ({ ...prev, mappingConfig: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSubmit} disabled={creating}>
              <Save className="w-4 h-4 mr-2" />
              {creating ? "Saving..." : "Save Mapping"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Parser Field Catalog</CardTitle>
          <CardDescription>
            Explore the fields each parser emits so you can align bank mappings without digging into Python code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
            <Select value={selectedBankCode} onValueChange={setSelectedBankCode}>
              <SelectTrigger className="w-full lg:w-60">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {bankFieldSchemas.map(schema => (
                  <SelectItem key={schema.bankCode} value={schema.bankCode}>
                    {schema.bankCode}
                    {schema.aliases.length > 0 ? ` (${schema.aliases.join(", ")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter fields by name"
                className="pl-9"
                value={fieldFilter}
                onChange={event => setFieldFilter(event.target.value)}
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleCopySchema}
              disabled={!selectedSchema}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy JSON
            </Button>
          </div>

          {selectedSchema ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>Parsers: {selectedSchema.parserClasses.join(", ")}</span>
                <span>Files: {selectedSchema.parserFiles.join(", ")}</span>
                {selectedSchema.aliases.length > 0 && (
                  <span>Aliases: {selectedSchema.aliases.join(", ")}</span>
                )}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Transaction Fields ({filteredTransactionFields.length})
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Normalized columns available on each transaction row.
                    </p>
                  </div>
                  {renderFieldBadges(filteredTransactionFields, "No transaction fields match the filter.")}
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Metadata Fields ({filteredMetadataFields.length})
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Extra data extracted from narration or reference numbers.
                    </p>
                  </div>
                  {renderFieldBadges(filteredMetadataFields, "No metadata fields for this parser.")}
                </div>

                <div className="space-y-2">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">
                      Statement Metadata ({filteredStatementFields.length})
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Summary fields from the statement header/footer.
                    </p>
                  </div>
                  {renderFieldBadges(filteredStatementFields, "No statement metadata fields match the filter.")}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Schema JSON</h4>
                <pre className="max-h-72 overflow-auto rounded-md bg-muted/70 p-3 text-xs">
                  {JSON.stringify(selectedSchema, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
              Select a bank to preview its parser fields.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-semibold">Existing Mappings</CardTitle>
            <CardDescription>Enable or disable mappings and keep versions updated.</CardDescription>
          </div>
          <div className="w-full flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={includeInactive}
                onCheckedChange={value => setIncludeInactive(value)}
              />
              <span className="text-xs text-muted-foreground">Include inactive</span>
            </div>
            <Input
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value.toUpperCase())}
              placeholder="Filter bank code"
              className="w-full sm:w-32"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchMappings}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Apply
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
              Loading mappings...
            </div>
          ) : filteredMappings.length === 0 ? (
            <div className="border border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground">
              No mappings found for the selected filters.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="hidden lg:block space-y-3">
                {filteredMappings.map(mapping => (
                  <Card key={mapping.id} className="border border-border/70">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{mapping.bankCode}</Badge>
                            <span className="text-sm font-semibold text-foreground">
                              {mapping.fieldKey} → {mapping.mappedTo}
                            </span>
                            <Badge variant={mapping.isActive ? "default" : "outline"}>
                              {mapping.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {mapping.description && (
                            <p className="text-xs text-muted-foreground mt-1">{mapping.description}</p>
                          )}
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Version {mapping.version} • Updated {new Date(mapping.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={mapping.isActive}
                              onCheckedChange={() => toggleActive(mapping)}
                            />
                            <span className="text-xs text-muted-foreground">
                              {mapping.isActive ? "Disable" : "Enable"}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMapping(mapping)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {mapping.mappingConfig && (
                        <pre className="bg-muted/60 text-xs rounded-md p-3 overflow-x-auto">
                          {JSON.stringify(mapping.mappingConfig, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="space-y-3 lg:hidden">
                {filteredMappings.map(mapping => (
                  <div key={mapping.id} className="rounded-lg border border-border/70 bg-card p-4 shadow-sm space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{mapping.bankCode}</Badge>
                        <span className="text-sm font-semibold text-foreground">
                          {mapping.fieldKey} → {mapping.mappedTo}
                        </span>
                      </div>
                      {mapping.description && (
                        <p className="text-xs text-muted-foreground">{mapping.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        v{mapping.version} • Updated {new Date(mapping.updatedAt).toLocaleString()}
                      </p>
                      <Badge variant={mapping.isActive ? "default" : "outline"}>
                        {mapping.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    {mapping.mappingConfig && (
                      <pre className="bg-muted/60 text-xs rounded-md p-3 overflow-x-auto">
                        {JSON.stringify(mapping.mappingConfig, null, 2)}
                      </pre>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-[120px]"
                        onClick={() => toggleActive(mapping)}
                      >
                        {mapping.isActive ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 min-w-[120px]"
                        onClick={() => deleteMapping(mapping)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
