# Persona login and TL / Leadership expansion — implementation plan

**Status: Approved by the user on 5 November 2026; implementation and validation recorded in README.md.**

**Prepared:** 5 November 2026

**Source workbook:** `Doodleblue Sobha_RM_Platform_Feature_Mapping_V2 (1).xlsx`

**Existing application:** Sobha RM prototype, including the remarks fix on `main`.

## 1. What approval covers

Add a persona-selection login page, retain the RM application as the shared foundation, and implement the additional TL and Leadership capabilities explicitly described in the workbook.

The intended inheritance is:

**RM base views → TL inherits RM views and adds team supervision → Leadership inherits those views and adds enterprise oversight.**

Empty workbook sheets will reuse the inherited screen. They will not trigger new custom screens or invented features. Existing customer detail, financials, documents, handover prerequisites, registration prerequisites, scheduling, remarks and exports will continue to work.

This remains a front-end prototype using simulated data and browser persistence. The login will select a demo identity; it will not validate passwords against a production identity provider. Production authentication and server-enforced authorization would be a separate implementation.

## 2. Current application and the changes needed

The application currently opens directly into an RM workspace. A header menu switches demo users, and TL / Leadership receive the same workspace with a Reports placeholder. There is no login session or route guard. TL data currently includes all units rather than a hierarchy-defined team. Only one monthly target is configured, and there is no task-creation workflow or tag-override audit history.

Development will introduce shared session, hierarchy, permission, filter and aggregation layers before adding the new screens. The recent HTTP-preview-compatible remark ID generator and existing remark regression checks will be retained.

## 3. Login and session experience

### `/login`

A Sobha-branded page with three selectable persona cards:

| Persona              | Card description                                        | User selector         |
| -------------------- | ------------------------------------------------------- | --------------------- |
| Relationship Manager | Manage assigned customers and daily follow-ups          | RMs only              |
| Team Lead            | Review team portfolios, collections and work allocation | TLs only              |
| Leadership           | Review enterprise performance and management reports    | Leadership users only |

1. Select a persona.
2. Select a seeded user belonging to that persona; show the user's name and team / portfolio context.
3. Click **Login to workspace**.
4. Open `/workspace` with that user's role, scope and additional panels.

Proposed behavior:

- Clearly label the entry as **Demo login**. Do not ask for an unused password or claim real authentication.
- No identity selected by default on a fresh session; require a valid persona / user pair.
- Preserve the demo session through a page refresh using session storage. Keep demo business records in the existing persistent store separately.
- A signed-out request for an application route redirects to `/login`. After login, restore a requested route only if the identity has access; otherwise open its workspace.
- A signed-in visit to `/login` redirects to the workspace. The header provides **Change persona** and **Logout**.
- Change persona clears the active identity and returns to login; it does not reset customers, tasks or remarks.
- Logout clears the session, filters, open panels and cached search results, but preserves demo business data.
- Existing stored `userId` must not silently bypass the new login on upgrade.
- Role name, user name and sidebar context update together. Remove the current unrestricted in-place role-switch menu in favor of the login flow.

## 4. Access and inheritance

| Capability                                 | RM                                         | TL                                                               | Leadership                                                            |
| ------------------------------------------ | ------------------------------------------ | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| Workspace                                  | Existing personal workspace                | RM foundation + team panels                                      | Inherited foundation + enterprise panels                              |
| Customer 360 and Customer Detail           | Assigned units                             | Reporting RMs' units                                             | All customer portfolios                                               |
| Collections                                | Assigned portfolio                         | Team worklists + tower summary                                   | Inherited views across the enterprise                                 |
| Handover / Registration, including details | Existing screens                           | Same screens, team scope                                         | Same screens, enterprise scope                                        |
| Projects                                   | Existing view-only, all-projects catalog   | Same                                                             | Same                                                                  |
| FAQs / KB                                  | Existing browse experience                 | Same, existing supervisor upload permission                      | Same, existing supervisor upload permission                           |
| Tickets                                    | Existing RM workflow; RM sets priority     | Inherited team view; retain RM-only priority setting             | Inherited layout with read-only ticket oversight                      |
| Tasks                                      | View and complete own assigned tasks       | Team task overview + create unit-level RM task                   | Same capability across the enterprise                                 |
| Remarks                                    | Add own remarks; edit own eligible remarks | Add separately labelled supervisory remarks; review team history | Add separately labelled management remarks; review enterprise history |
| Behavioral tags                            | Existing fixed-list edits                  | Audit-logged override                                            | Inherited audit-logged override                                       |
| Reports                                    | No management Reports route                | Defined team reports                                             | Team reports + enterprise reports                                     |
| Escalation review Excel                    | No new module                              | No new module                                                    | Upload and review, per LDD-014                                        |

Inheritance applies to screens and features, with explicit workbook restrictions taking precedence. In particular, **LDD-013 makes Leadership ticket oversight read-only**: no priority changes, status changes, replies or ticket creation in that persona. Leadership can still add management remarks on the customer record. TL does not automatically gain the RM-only priority-setting action.

Enforce scope and permissions in queries and mutation functions as well as navigation. Entering a URL directly must not expose another team's customer, ticket or report. This is prototype permission behavior, not a claim of backend security.

## 5. Workbook coverage and blank-sheet handling

### Sheets with explicit additions

| Sheet                    | Defined feature rows | Planned treatment                                                                                                                             |
| ------------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `TL - Workspace`         | 6–17                 | Team header, capacity, aggregated KPIs, aging, RM and customer lists, operational lists, task creation, supervisory remarks, filters, exports |
| `TL - Customer 360`      | 6–10                 | Team analytics, Assigned RM column, same customer drill-down, tag override audit, remarks overview                                            |
| `TL - Collections`       | 6–8                  | Team overdue / upcoming worklists, interest and PC tracker, tower summary                                                                     |
| `Leadership - Workspace` | 6–19; LDD-001–014    | Enterprise dashboard, management reports, oversight, manager remarks, escalation-sheet review                                                 |

TL feature sheets do not contain Ref IDs; use sheet names and row numbers as traceability references. Open Questions contains TLW / TLC / TLR references but does not establish extra feature rows.

### Empty sheets: reuse, no additional custom design

| Empty workbook sheet(s)                                              | Reused screen / behavior                                                                 |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `TL - Customer 360 Detail`                                           | Existing RM Customer Detail, with TL scope and inherited supervisory actions             |
| `TL - Handover & Reg List`, `TL - Handover & Reg Detail`             | Existing RM Handover / Registration list and detail                                      |
| `TL Projects`, `TL Tickets`, `TL FAQS`                               | Existing corresponding RM screens, with applicable TL scope / permissions                |
| `Leadership - Customer 360`, `Leadership - Customer 360 Detai`       | Shared customer screens; inherit defined TL directory enhancements with enterprise scope |
| `Leadership - Collections`                                           | Shared collections screen, including inherited TL summaries, with enterprise scope       |
| `Leadership - Handover & Registr`                                    | Existing Handover / Registration screens with enterprise scope                           |
| `Leadership - Projects`, `Leadership - Tickets`, `Leadership - FAQS` | Shared RM layouts; apply the Leadership read-only ticket restriction from LDD-013        |
| `Sheet18`                                                            | Ignore; no defined content or identifiable feature                                       |

`Open Questions` is a clarification register. References to Leadership Admin, CMS, attrition or bulk target maintenance do not authorize building additional Admin / CMS modules in this phase.

## 6. Team Lead additions

### 6.1 Workspace — `TL - Workspace`, rows 6–17

Keep access to the four RM lifecycle areas and add:

- **Team header:** number of reporting RMs, unique active customer/unit rows, managed account count, and selected scope.
- **RM capacity:** each RM's assigned load, configured capacity (default 300), utilization percentage and an overload indicator. The workbook's approximate 1,500–2,000 accounts is an example, not a literal KPI.
- **Team collections:** current-month target, achieved, achievement %, overdue and RM-wise comparison using shared finance rules.
- **Aging matrix:** RM rows against 0–30, 31–90 and 90+ day overdue balances, with drill-down into the filtered collections list.
- **Lifecycle summaries:** support counts, collections, handover and registration achieved / targets. Do not invent support targets where none exist.
- **RM portfolio table:** RM, projects / towers, customer load, monthly realization, target achievement and overdue exposure.
- **Customer drill-down table:** customer, unit, assigned RM, demanded, collected and overdue days; click opens the existing customer detail.
- **Operational previews:** team handovers, registrations and support queues with Assigned RM. Support can be filtered by priority, segment and RM. Detail links reuse existing RM destinations.
- **Create task:** choose an in-scope RM and one of their mapped units; enter title, description and optional priority / due date. New task starts Open, records its creator and appears in that RM's workspace / My Tasks immediately.
- **Supervisory remarks:** add TL-authored remarks to the existing consolidated thread with a Supervisor marker. Preserve RM remarks as separate records.
- **Shared RM, project and wing filters:** update every relevant team widget and list consistently. Dependent selectors clear invalid selections.
- **Reports / export:** open the team report catalog described in section 8.

### 6.2 Customer 360 — `TL - Customer 360`, rows 6–10

Reuse the existing directory and detail screens, adding:

- Team-scoped segment / tag counts, overdue exposure and risk summaries. Proposed risk summary uses existing Segments 3–4 and Possible Cancellation; do not introduce a new hidden risk score.
- **Assigned RM** column and readable RM-name filter; show primary RM and `+N` for multiple mappings, with all assigned names available in a tooltip / detail.
- Audit-logged tag override: record previous tags, new tags, actor, role, timestamp and a required reason. Do not delete the previous audit entry when tags change again.
- Remarks overview: RM / author, unit, area, remark and timestamp, with filters and a link to the same customer detail.
- Use the existing remark permissions and preserve external-ticket-reply separation.

### 6.3 Collections — `TL - Collections`, rows 6–8

Reuse RM collections and add:

- Team overdue and upcoming views, using the existing calendar-month projection horizon.
- Assigned RM on worklists; RM, project and wing filters.
- Interest-applied and Possible Cancellation trackers with customer drill-down.
- Tower summary with outstanding, collectible amount and target.
- Keep interest / waiver approval in simulated D365; do not add a TL waiver-approval action.

Proposed meaning of **collectible**: unpaid amounts due on or before the selected month's end, including overdue balances, without counting the same demand twice. Label this assumption. Tower targets must come from explicit seeded target records; do not fabricate a tower split from an RM total. If a selected tower has no target record, show **Not configured**.

## 7. Leadership additions — exact LDD coverage

Use `/workspace` for the enterprise workspace; use shared customer / operational routes for drill-down. Reports lives at `/reports`. A new `/escalations` route supports the explicitly requested review-sheet upload.

| Ref     | Workbook feature                         | Planned implementation                                                                                                            |
| ------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| LDD-001 | Active customers by segment              | Enterprise active customer/unit counts by existing derived segment; click to filter Customer 360                                  |
| LDD-002 | Enterprise target vs achieved            | Enterprise total and project breakdown from explicit mock target records and attributed receipts                                  |
| LDD-003 | Aging receivables                        | Enterprise 0–30 / 31–90 / 90+ overdue matrix; project / TL / RM drill-down                                                        |
| LDD-004 | Collection targets by category           | Management-only PC, Regular and New Billing target / achieved / balance view                                                      |
| LDD-005 | RM-wise performance summary              | RM target, achieved, achievement %, overdue and ticket counts; filter and export                                                  |
| LDD-006 | Segment-wise performance and receivables | Counts, achieved collections, overdue and outstanding by segment                                                                  |
| LDD-007 | Upsell initiated vs closed               | Per-RM initiated / closed counts and conversion rate; preserve Rejected / Cancelled as separate statuses                          |
| LDD-008 | Four lifecycle KPIs                      | Enterprise Support, Collections, Handover and Registration roll-up, linked to existing views                                      |
| LDD-009 | Targets vs current download              | Filtered Excel report with selected month, scope, targets, current achievements and variances                                     |
| LDD-010 | PC / interest customer list with RM      | Shared customer worklist with Assigned RM, separate PC / interest filters; no invented dispute workflow                           |
| LDD-011 | Manager remark                           | Leadership-authored consolidated remarks, clearly marked as management / supervisory guidance                                     |
| LDD-012 | Enterprise customer drill-down           | Existing Customer Detail across all projects, with originating report context preserved                                           |
| LDD-013 | Read-only ticket oversight               | Department / team queues in the existing ticket layout; view-only detail and threads; no mutations                                |
| LDD-014 | Excel escalation review sheet            | Upload → validate → preview → confirm import into a separate review register; review and drill-down without auto-creating tickets |

Leadership also inherits TL capacity, RM comparisons, task creation, tag-audit review and team-level drill-down, expanded to its authorized enterprise scope. Add TL / team, RM, project and wing selectors to management views; provide month selection where the underlying metric is monthly. Keep current-state counts distinct from monthly activity metrics.

## 8. Reports and escalation upload

### Reports catalog

Replace the current placeholder with a modest catalog whose reports correspond to defined workbook features:

| Report                            | TL scope                                 | Leadership scope                 |
| --------------------------------- | ---------------------------------------- | -------------------------------- |
| Targets vs current achievement    | Team / RM                                | Enterprise / project / team / RM |
| RM performance and capacity       | Team                                     | Enterprise                       |
| Aging and overdue exposure        | Team                                     | Enterprise                       |
| Handover / registration progress  | Team                                     | Enterprise                       |
| Support queue                     | Team                                     | Enterprise, read-only            |
| Segment receivables / performance | Shared team analytics export             | Enterprise management report     |
| Upsell conversion                 | No additional standalone report proposed | Enterprise / RM                  |
| Escalation review register        | Not added                                | Imported register                |

Downloads use the visible filters and existing `.xlsx` export. Include scope, month where applicable, source and D-1 freshness in report metadata. Report names are proposed defaults because Open Question #69 asks which predefined reports are required.

### Escalation review import — proposed demonstration schema

The attached workbook maps platform features; it is **not** the actual escalation data template. Until a real template is supplied, provide a downloadable sample with:

`Review ID, Unit Number, Customer Code, Assigned RM, Category, Subject, Description, Priority, Review Status, Review Date, Manager Remark`

- Required fields: Review ID, Unit Number and Subject. Identify an existing unit using Unit Number and, when needed to disambiguate, Customer Code / project context. Flag ambiguous or unknown references.
- Configurable prototype limits: `.xlsx` / `.csv`, maximum 5 MB and 5,000 data rows.
- Preview valid rows and row-specific errors before import. Confirm only when blocking validation errors are resolved; allow cancel without mutation.
- Duplicate Review IDs are validation errors in the first implementation; do not silently overwrite imported reviews.
- Preserve supplied status values; a blank status is **Unspecified**. Do not invent an escalation lifecycle or automatic SLA calculation.
- Store imported rows, import timestamp and uploader separately from native tickets. Render spreadsheet content as text.
- Provide imported review filters, export and customer drill-down. Leadership can add manager guidance without converting the item to a native ticket.
- The import design is a proposed prototype default for approval, not an assertion that Sobha has confirmed this template.

## 9. Shared scope, data and calculation work

### Hierarchy and permissions

Add explicit RM → TL → Leadership relationships and a central capability map. Use a demo hierarchy containing at least two TL teams so team isolation can be demonstrated and tested. Preserve the current hero customer and existing RM scenarios. Extra account volumes remain seed configuration, not copied worksheet examples.

All unit-derived queries must use one authorized scope: dashboard cards, search, typeahead, lists, task assignment, notifications, visit counts, deep links and exports. Projects retains the workbook's existing all-projects view-only behavior; KB resources remain shared according to existing access rules.

### Data extensions

- Users: hierarchy / manager links, department / team and RM capacity.
- Targets: per RM / month; explicit project, tower and management category targets with defined reconciliation.
- Tasks: creator identity and role, assigned RM, linked unit, description and optional priority / due date.
- Tag audit events: before / after, actor, role, reason and timestamp.
- Escalation imports: validated review records plus import batch metadata.
- Ticket oversight: assignment / department metadata; optional supplied SLA fields, never a fabricated policy.
- Preferences: per-user columns and role-appropriate filters; reset incompatible selections on identity change.

Use a versioned, backward-compatible store migration that adds missing fields while preserving existing remarks, uploads, tickets and task changes. Keep login state separate from business data. Reset demo data stays an explicit user action.

### Multiple RMs and reconciliation — proposed policy

A unit may be visible to multiple mapped RMs. Customer / unit counts in a team or enterprise view must deduplicate unit/customer relationships, and ledger rows must not be counted twice.

For management RM performance comparisons, **attribute money and lifecycle achievements to the primary mapped RM** (the existing first-mapping convention). Display shared assignments separately. This makes attributed RM report totals reconcile with enterprise totals. Keep an RM's operational mapped-portfolio view intact and clearly label management attribution so the two views are not mistaken for identical scopes. Targets must align with that attribution convention. This reporting policy is a proposed assumption to approve, since the workbook does not define multi-RM attribution.

### Reusable calculations

- Reuse existing finance / segmentation / stage rules, D365 freshness labels, current-month conventions and Indian currency formatting.
- Aging labels are configurable; proposed boundaries are 1–30, 31–90 and >90 overdue days, with the first displayed as the workbook's **0–30**. Zero-overdue accounts must not add an amount to overdue buckets. Do not confuse this management matrix with PC-specific segment thresholds.
- Monthly targets: sum relevant explicit target records once. Do not reuse the demo RM's target as an enterprise target.
- Management collection categories must be mutually exclusive: PC-tagged units first; for remaining units, New Billing for eligible current-month demands, otherwise Regular. Any receipt allocation that cannot be derived from mock ledger allocation gets explicit seeded allocation metadata. This is a proposed rule pending business confirmation; do not double-count PC current-month billing.
- Upsell conversion: proposed monthly cohort = requests raised in the selected month; conversion = closed requests in that cohort / all requests in that cohort. Keep status counts visible and handle zero denominator as `—`.
- Sum widgets and report rows from the same filtered query results. Card clicks carry their filters into the destination.
- Keep the existing distinction between installment balance and interest-inclusive outstanding visible; this phase does not silently redefine the earlier unresolved finance rule.

## 10. Proposed defaults and unresolved business questions

Approval of this plan authorizes the labelled prototype defaults below; they remain configurable and marked as assumptions in the UI where relevant.

| Topic                      | Proposal / boundary                                                                   | Workbook evidence                                     |
| -------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Login                      | Persona + seeded user; demo session, no real password / SSO                           | New user request                                      |
| RM capacity                | Default 300, per-RM seed override                                                     | TL Workspace row 7; Open Q #66                        |
| Achieved / aging           | Retain posting-date receipt logic and existing aging rules; expose management buckets | Open Q #67–68, #72                                    |
| Report inventory           | Use the catalog in section 8; do not invent unspecified management reports            | Open Q #69, #74–75                                    |
| Tag overrides              | TL and Leadership may override with reason + audit; RM fixed-list behavior stays      | TL Customer 360 row 9; Open Q #70                     |
| Tower collectible / target | Definition and explicit target handling in section 6.3                                | Open Q #71                                            |
| Category targets           | Leadership-only breakdown; no new three-bucket RM card                                | LDD-004; Open Q #2, #73                               |
| Multi-RM attribution       | Primary-RM management attribution, deduplicated organization totals                   | Multiple mapping supported; attribution not specified |
| Leadership ticket SLAs     | Show supplied due dates / SLA fields only; otherwise `SLA not configured`             | LDD-013; Open Q #64                                   |
| Escalation template        | Proposed sample / preview import; keep separate from native tickets                   | LDD-014; Open Q #76                                   |
| Production access          | No backend authentication, SSO, real D365 / CMS / SharePoint integration              | Existing prototype constraint                         |
| Blank persona sheets       | Inherit screens, no extra bespoke modules                                             | Explicit user instruction                             |

## 11. Implementation sequence after approval

1. Add hierarchy, capability definitions, scope queries, explicit targets and safe store migration; cover scope / deduplication rules with tests.
2. Add `/login`, session handling, logout / change persona, guarded routes and role-aware shell text. Update existing browser tests to log in explicitly.
3. Add TL workspace panels, shared management filters, assigned-RM columns, task creation, audited tag override and remarks overview.
4. Extend shared collections with team worklists and tower summaries. Reuse the existing customer and handover detail components.
5. Add Leadership enterprise workspace and defined report catalog / exports, including read-only ticket oversight.
6. Add the escalation-review import / preview / register workflow using the approved prototype schema.
7. Validate all personas, migrations, aggregate reconciliation and inherited RM workflows; document final behavior and remaining business assumptions.

Organize new features into focused modules such as `features/auth`, `features/team-workspace`, `features/leadership-workspace`, `features/reports` and `features/escalations`. Extract shared layout / role guards from the current large application module as needed; avoid duplicating the RM application for each persona.

## 12. Acceptance checks

- [ ] Fresh and signed-out sessions see login; persona selection only offers users of that role.
- [ ] Login, refresh, logout, change persona and authorized deep-link return work without deleting business data.
- [ ] RM sees its original views and mapped customers; TL sees only reporting RMs; Leadership sees all teams. Test both visible lists and direct URLs / mutation functions.
- [ ] Global search, counters, notifications, previews and exports respect the same scope; switching persona clears stale results.
- [ ] Empty-sheet modules reuse shared RM components; Leadership additionally inherits the populated TL features.
- [ ] Each populated TL feature row and every LDD-001–014 requirement has a working UI / export or an explicitly labelled unresolved data value.
- [ ] Shared filters affect all relevant management cards, charts, lists and downloads; drills preserve context.
- [ ] Team / enterprise totals deduplicate shared units; attributed RM rows reconcile to management totals. Target records and category buckets reconcile without invented splits.
- [ ] TL / Leadership task creation delivers the task to the chosen RM; another team's RM cannot be assigned by a TL. Open / Closed updates remain consistent.
- [ ] Tag overrides record reason, actor, role, before / after and time; existing tag history is preserved.
- [ ] Supervisory remarks remain separate from RM remarks, show the correct author role, persist after reload and appear in existing consolidated views.
- [ ] Leadership ticket oversight exposes no edit controls, and its mutation paths reject changes. Missing SLA policy is labelled, not guessed.
- [ ] Escalation import rejects invalid / ambiguous rows and duplicates, previews before committing, and does not create native tickets automatically.
- [ ] Existing persisted customer data survives the migration, including added remarks and uploaded sign-off / sale-deed documents.
- [ ] Existing handover / registration guards, filtered Excel exports, HTTP-preview remark saves and inherited RM workflows continue to pass.
- [ ] `npm run build`, business-rule tests and updated persona / regression browser suites pass.

## 13. Approval checkpoint

**Deliverable now:** this Markdown plan only. No login page, feature implementation, application configuration change, deployment or push is part of this planning step.

**After your approval:** implement the scope and proposed defaults above, validate the workflows, and report the completed changes. Any material departure from this plan will be brought back for review.
