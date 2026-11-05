# Sobha relationship management prototype

Responsive React 18 / TypeScript / Vite prototype implementing the RM specification and the approved [persona expansion plan](docs/PERSONA_LOGIN_AND_ROLE_EXPANSION_PLAN.md), mapped to `Doodleblue Sobha_RM_Platform_Feature_Mapping_V2 (1).xlsx`.

## Run

Node 22+ (validated with Node 24), npm 11:

```sh
npm ci
npm run dev
```

Vite serves port 5173. Start at `/login`, select a persona and a demo user, and choose **Login to workspace**. No password or production credentials are required. This is a simulated frontend, not production authentication or backend authorization.

## Personas

| Persona    | Demo users                                                             | Scope and additions                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RM         | Ananya Sharma, Arjun Menon, Priya Nair, Rahul Rao                      | Existing mapped-customer workflow                                                                                                                      |
| TL         | Vikram Desai (South: Ananya, Arjun, Priya), Kavya Reddy (North: Rahul) | RM foundation plus team analytics, capacity, aging, task creation, audited tag overrides, remark review and reports                                    |
| Leadership | Meera Iyer                                                             | Inherited views across teams, enterprise insights, category targets, segment / upsell reports, read-only ticket oversight and escalation review import |

Empty persona sheets reuse existing RM layouts. Reports and Escalation Review are guarded by persona. TL data uses explicit hierarchy relationships; global search, deep links and mutations use the same authorized scope. Projects remains the shared view-only all-projects catalog.

Refresh preserves the active demo session in **sessionStorage** (`sobha-demo-session`). **Change persona** and **Logout** return to login and clear transient scope / search / panel state while retaining business records. Old saved `userId` does not bypass login.

## Workflows

- Search `B-0902` for the hero customer. To complete handover, schedule a Handover visit in Customer Detail, then upload a **Customer sign-off** in the **Handover** bucket. Registration requires project OC, collected details and a **Sale deed** in the **Registration** bucket.
- In a TL / Leadership workspace, **Create RM task** chooses an in-scope RM and one of their mapped units. The RM receives the task in Workspace / My Tasks and a notification.
- **Override tags** in Customer Detail requires a supervisory reason. The dialog retains before/after values, author, role and time. Supervisory remarks stay separate from RM remarks and appear in consolidated history.
- Management scope controls month, team (Leadership), RM, project and wing. Current-state exposure / capacity is labelled separately from selected-month receipts and lifecycle activity.
- Reports provide filtered Excel downloads. **Download report with scope** includes a metadata sheet with filters, persona, month, source, D-1 date and attribution convention. Table **Export** downloads the corresponding filtered rows.
- Leadership ticket oversight shares the ticket layout but has no priority, status, creation or reply mutations. Missing SLA policies show **SLA not configured**.
- Leadership **Escalation Review** supports `.xlsx` and `.csv` (first sheet), up to 5 MB and 5,000 rows. Download the sample template, upload, review validation and confirm import. Required columns: `Review ID`, `Unit Number`, `Subject`; supply `Customer Code` to resolve ambiguous units. Duplicate IDs and invalid references block confirmation. Imported reviews remain separate from native tickets; manager guidance updates the review and consolidated customer remarks.

## Data and calculations

The business store persists in **localStorage** (`sobha-demo-v1`, version 2). The migration adds hierarchy-related metadata and management data without replacing existing customer edits, remarks, uploaded documents or task changes. **Reset demo data** explicitly restores the seed.

The seed includes 520 inventory rows, four projects, 298 sold/history rows mapped to the demo RM, 75 tickets, 17 initial tasks and 68 KB articles. The existing hero and RM scenarios are retained. Explicit mock CMS target records cover each RM / project / tower / category for three months. The demo RM has Rs 18.20 Cr receipts against a Rs 24.27 Cr target in the current seed month.

Shared units remain visible to mapped RMs. Management financial and lifecycle reporting attributes each unit to its **primary mapped RM** to prevent double counting. A TL can see a unit shared from another team; its financial achievement remains attributed to its primary owner. Unique managed-account counts and attributed performance are labelled separately. Management category receipts are disjoint: PC-tagged first, then explicit New Billing / Regular allocation. Upsell conversion uses the selected month's request cohort and preserves Rejected / Cancelled counts.

Documents uploaded to the prototype use browser-local data URLs (2 MB per file); use small demonstration documents to stay within browser storage limits. Generated statements and letters are not retained. Template sharing, signing and document downloads are simulated and clearly marked as prototype content.

## Validation

```sh
npm run build          # TypeScript and production build
npm test               # Scope, permissions, reconciliation, migration, import and ID rules
# Start npm run dev before the following:
npm run test:browser    # Existing RM workflow, documents, tickets and filtered Excel
npm run test:remarks    # HTTP-compatible saves, edit/reload and cross-screen remarks
npm run test:personas   # Login, hierarchy isolation, tasks, audit, browser migration, reports, imports
npm run test:responsive # Phone/tablet/desktop layouts, navigation, tables and form interactions
```

Browser tests use Playwright and `/usr/bin/chromium`. Override `CHROMIUM_PATH` and/or `BASE_URL` for another machine or port. `npm run format` formats source and scripts.

## Structure

- `src/features/auth`: demo login and separate session state.
- `src/features/management`: inherited team / enterprise workspaces, scope controls, task creation and tag audit.
- `src/features/reports`: report catalog and exports with scope metadata.
- `src/features/escalations`: import validation, preview and separate review register.
- `src/data/users.ts`, `access.ts`: hierarchy, capabilities, route and mutation scope checks.
- `src/data/management`: explicit target seeds, primary-RM attribution, management calculations and tests.
- `src/data/repo`: persisted business store and backward-compatible migration.
- `src/data/config.ts`: prototype assumptions, thresholds, permissions and import limits.
- `src/components`: shared virtualized tables, dialogs, cards and remark composer.
- `src/app`: role-aware shell, shared RM routes and scoped data hook.

## Prototype boundaries

No live D365 / Fabric / CMS / SharePoint, identity provider, signing or messaging integration exists. Construction images are illustrative graphics and project documents are placeholder PDFs. Timeline wording, report inventory, collectible definition, management attribution / category allocation and escalation schema are approved demo assumptions awaiting business confirmation. No unspecified Admin / CMS modules were added from Open Questions or blank sheets.

`Balance pending` follows the original installment-demands-minus-receipts formula; interest-inclusive `Outstanding` is shown separately. Handover initiation also checks the full ledger balance. This preserves the earlier documented ambiguity rather than changing ledger data to conceal it. Interest is sourced from the mock ledger; CRM does not recalculate it.

## Responsive layout

The login and all persona views adapt to phone, tablet and desktop widths. Below 1025px the sidebar becomes a focus-trapped navigation drawer, with links that close the drawer and support Escape / backdrop dismissal. Desktop collapse state is independent from the drawer, and resizing to desktop closes it safely.

Cards and profile sections stack as space reduces; mobile filters and dialogs remain usable at narrow and short landscape sizes. Touch devices receive larger controls, and input text avoids automatic focus zoom. Wide data tables retain their columns inside a labelled, keyboard-focusable horizontal scrolling region with a scroll hint; the page itself does not scroll sideways. Virtual rows measure their actual height as controls and content resize.

`npm run test:responsive` checks layouts from 320px through 1920px, RM routes at 320 / 390 / 768 / 1024 / 1280 / 1440px, management routes at phone and tablet widths, and drawer / dialog behavior in landscape. Business data, permissions, filtering and exports use the same existing implementation.
