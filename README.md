# Sobha Relationship Manager prototype

A desktop-first React 18 / TypeScript prototype based on `Sobha_RM_Platform_Prototype_Spec.md`. All services and document sharing are simulated. No production credentials or backend are required.

## Run

Node 22+ (validated with Node 24), npm 11.

```sh
npm ci
npm run dev
```

Vite serves port 5173. `npm run build` type-checks and produces `dist/`; `npm test` runs the business-rule tests.

Optional browser smoke test: with Playwright available and Chromium installed, run `node scripts/smoke.cjs` against the running development server. It validates routes, persistent remarks, scheduling, document-gated completion, ticket consolidation, and supervisor navigation. The system Chromium executable is `/usr/bin/chromium`; adjust it for another machine.

## Demo

Start at `/workspace`. The user menu switches between four RMs, a team lead and Leadership. Reports is supervisor-only. Search `B-0902` to open the hero customer. To exercise handover completion, schedule a Handover visit from Customer Detail, then upload a **Customer sign-off** document in the **Handover** bucket from the handover detail screen. Registration needs a **Sale deed** document in the **Registration** bucket and an OC-enabled project.

The single Zustand store persists to localStorage (`sobha-demo-v1`). Reset demo data in the user menu restores the fixed seed. Uploaded documents are stored locally as data URLs; the prototype limits each upload to 2 MB. Use small documents and reset if browser storage fills. Generated statements and letters are not retained. Document downloads are explicitly marked prototype PDFs; Share and Share for signing simulate confirmation without sending anything.

## Structure

- `src/data/config.ts`: assumptions, configurable thresholds, role permissions, tags and categories.
- `src/data/seed`: typed entities and deterministic Indian customer data (520 inventory rows, four projects, 298 sold/history rows mapped to the demo RM, 75 tickets, 17 tasks, 68 KB articles).
- `src/data/repo`: persisted store and mutations.
- `src/data/rules`: shared finance, scope, aging, segmentation and readiness queries.
- `src/components/ui.tsx`: Radix modal, virtualized TanStack table, filtered XLSX exports, cards and controls.
- `src/app/App.tsx`: shell, routes and feature screens.

Finance and portfolio cards share query functions. Current-month collection receipts total Rs 18.20 Cr across the demo RM's sold/history accounts, against the configured Rs 24.27 Cr target. D365 cards show D-1 freshness. Dates use the session clock; the fixed historic hero visit remains 02 Nov 2026, and does not appear as an upcoming visit after that date.

## Prototype limits and source questions

Construction assets are illustrative CSS graphics, not actual site photographs. Project resources use placeholder PDFs. Construction milestones and account milestone names are illustrative, and the activity timeline is marked as placeholder stages. No Fabric, CMS, SharePoint, D365 or signing integration exists. No bank-loan details, ticket SLAs, referral feature, or TL/Leadership screens beyond role scope and Reports are invented.

Financial `Balance pending` follows the supplied Installment-demands-minus-receipts formula; `Outstanding` additionally includes interest debits. The source specification also says those two must match D365 closing balance, which is ambiguous for interest-bearing accounts. These amounts are shown separately rather than changing ledger data to conceal the difference.

The implementation uses native form controls styled with Tailwind and a shared CSS layer, with accessible Radix dialogs. All workflows are local demonstrations; resource bodies and templates contain illustrative guidance that requires business review before real use.
