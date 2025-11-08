# Superuser & Admin Portal Setup

This guide walks through enabling the new superuser experience, seeding baseline data, and running the automated checks that cover the document lifecycle helpers.

## 1. Apply Latest Prisma Changes

```bash
# ensure your database is up-to-date
npx prisma migrate deploy

# regenerate the Prisma client for the new enums/models
npx prisma generate
```

> **Required migrations:**
> - `20250109000001_add_unique_transaction_constraint` unlocks the user status column referenced by the admin console.
> - `20250111000000_add_audit_logs` provisions the audit trail tables used by the new security tooling.
>
> If either migration failed previously, resolve it with:
>
> ```bash
> npx prisma migrate resolve --rolled-back <migration_name>
> ```
>
> Then re-run `prisma migrate deploy`.

## 2. Seed Superuser Resources

The helper script below promotes the default superuser (if needed), publishes an organisation-wide “Admin Setup Guide” document, and seeds an example bank field mapping.

```bash
npm run seed:admin
```

You can re-run the script at any time; it skips records that already exist.

## 3. Run the Automated Tests

The repository now ships with a lightweight test harness that exercises the shared document utilities (`formatFileSize`, delete-mode validation, etc.).

```bash
npm run test
```

This uses Node’s test runner via `tsx`, so there is no extra configuration required.

## 4. Launch the Admin Console

1. Sign in via `/auth?tab=login` using the superuser credentials (`vishun@finance.com` / `Vishun@8291`).  
2. You will be redirected to `/admin`, where you can manage portal-level documents, users, bank field mappings, and audit activity.  
3. End-user documents remain available under **Settings → Docs** with the new download/delete options.

> **Audit dashboard offline?** If `/admin/audit` shows “Audit log storage not available yet”, it means the latest migrations have not run. Apply them using the commands above and restart the dev server.
>
> **Soft deletes.** When end users remove statements or related transactions, the records are now soft deleted. Visit `/admin/documents` to see deleted items, download copies, or restore them (with optional transaction recovery).

## 5. Mobile & Tablet Experience

The entire admin surface (overview, documents, bank mappings, users, audit) is now responsive. On smaller viewports:

- The sidebar collapses into a hamburger-driven tray; all navigation links remain touch-friendly.
- Filter bars and data tables stack gracefully with full-width inputs and wrapped action buttons.
- Critical cards keep padding and typography legible down to ~360 px.

Test drive combinations of phone/tablet/desktop sizes to validate your theme overrides.

## 6. Bank Parser Field Schemas

The bank-mapping admin screen now shows a “Parser Field Catalog” sourced from static JSON files that mirror the Python parsers.

- Regenerate the catalog whenever you tweak a parser by running:

  ```bash
  python tools/generate_bank_field_schemas.py
  ```

- The script scans `tools/parsers/**`, emits one JSON file per bank under `src/data/bank-field-schemas/`, and refreshes the TypeScript index at `src/data/bankFieldSchemas.ts`.
- Commit both the generator output and any parser changes together so the admin UI always reflects the latest field list.

## Troubleshooting

- **Windows file locks when running `prisma generate`:** close any dev servers (or VS Code TypeScript server), delete `node_modules/.prisma/client`, and rerun the command.
- **Shadow database failures during `prisma migrate dev`:** use `prisma migrate deploy` for existing databases, or amend early SQL migrations so they create the dependencies they reference.
- **Admin seed script complains about missing superuser:** run `npm run setup` (or the existing bootstrap workflow) to create core users, then retry.
- **Audit log storage unavailable message:** confirm the `add_audit_logs` migration has been deployed, then restart the server.

Once the steps above are complete, the superuser portal, document management flows, the audit trail, and cascaded deletion logic are ready for production use.

