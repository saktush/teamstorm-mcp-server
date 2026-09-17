# TeamStorm API 4.2x synchronization — change report

Updated: **2026-09-17**. The synchronization is implemented, with 81 registered MCP tools and 75 public operations covered. The 11 newly added metric/calendar endpoints remain coming soon. Verification: typecheck, lint and build pass; 333 tests pass in 33 files. No live TeamStorm calls were used to establish server defaulting or response optionality.

## Evidence and historical comparison

Pinned authority: [`api-v1-4.2x.yaml`](../api-v1-4.2x.yaml), OpenAPI 3.0.4, 104 paths, **170 operations / 190 component schemas / 38 tags**. SHA-256: `f0e727b99e28178c2f0b4c7bbe50b2162396d2c1180ff6cdce087e6fc9426840`.

The controller recovered the actual old spec from **`a650d7d:swagger.json` (2026-06-26)** into `api-baseline.json` in the audit workspace. It has **159 operations / 179 schemas**, matching the old coverage inventory. Unlike the earlier report-only comparison, this permits full structural comparison of the existing contracts. It is a June snapshot; it does not establish the immediately preceding 4.2x release boundary, intermediate changes, or when runtime enforcement changed.

Comparison method: key operations by HTTP method/full path; compare all shared operations and all shared component schemas after recursively removing `summary`, `description`, `example`, `examples` and treating `required` arrays as sets. Preserve all other types, refs, constraints, nullability and enum members. Independently recomputed results agree with the controller’s `baseline-contract-diff.json`: **11 endpoint additions, 0 removals, 0 operationId changes on shared endpoints; 11 added schema names, 0 removed; five structural diff rows on existing contracts**. Documentation text was excluded from this structural diff.

The old coverage report alone proves endpoint additions; the recovered full baseline supplies the evidence for request/parameter/schema changes below. A disagreement between a TypeScript declaration and a spec is a verified textual mismatch, **not evidence of a verified runtime API bug**. No live TeamStorm calls were made for this documentation task. Mock tests show handling of selected fixtures, not production server behaviour.

## Existing-contract changes established against June baseline

| Diff row | Contract | Historical → pinned | Disposition |
| --- | --- | --- | --- |
| 1 | ListWorkitemsUpdates query | ChangedToDate → changedToDate | Client already sends changedToDate; no new code correction required. |
| 2 | CreateWorkitemLinkRequestBody.properties | linkedWorkspace absent → string property | Add optional MCP input for explicit cross-workspace links; send a value for every API request (R10). |
| 3 | CreateWorkitemLinkRequestBody.required | linkedWorkitem/type → linkedWorkitem/linkedWorkspace/type | Same capability as row 2, not a second bug. Client defaults omitted input to resolved source workspace; implemented in accepted Task 2b (R10), preserving optional MCP input. |
| 4 | CreateWorkitemRequestBody.properties | startDate absent → optional nullable date-time | Accepted Task 2b adds optional nullable creation field/input. Coverage alone still does not establish live server acceptance. |
| 5 | Permission enum | Adds WorkspaceTimeMetrics and WorkspaceTreeMove; removes none | Record permission identifiers for authorization diagnostics/future metrics and tree-move use; no new role-management tool claimed. |

Other audited shared schemas/parameters are structurally unchanged against the June baseline. Most audit entries describe pre-existing client inaccuracies or unsupported capabilities, not newly introduced API 4.2x changes. **33 CONFIRMED audit entries + five SUSPECTED entries** are source classifications, with duplicate/shared fields and unchanged/out-of-spec checks; they are not 33 unique defects, 33 runtime failures, or 33 new contract changes.

## Eleven genuinely added endpoints and MCP proposals

All are **COMING SOON (planned)**, not registered tools. Four are reads and seven mutate metric settings/state. These SLA/OLA/custom metric clocks are a separate resource from manually logged worktime; they do not provide a public TimeTrackingEntry POST. Tool names below are proposals following the resource-first naming convention.

Every path below is exact and includes the public prefix. Metrics are workspace/task-scoped; templates workspace-scoped; work calendars global with no workspace parameter.

| Public method/path | operationId | Proposed MCP tool | Purpose |
| --- | --- | --- | --- |
| `GET /cwm/public/api/v1/work-calendars` | GetWorkCalendars | `teamstorm_work_calendars_list` | Возвращает список рабочих календарей. |
| `GET /cwm/public/api/v1/workspaces/{workspace}/workitem-metric-templates` | GetWorkitemTimeMetricTemplates | `teamstorm_time_metric_templates_list` | Возвращает список шаблонов метрик времени пространства. |
| `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics` | GetWorkitemTimeMetrics | `teamstorm_task_time_metrics_list` | Возвращает список метрик времени задачи. |
| `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}` | GetWorkitemTimeMetric | `teamstorm_task_time_metrics_get` | Возвращает метрику времени задачи. |
| `PATCH /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}` | UpdateWorkitemTimeMetricSettings | `teamstorm_task_time_metrics_update` | Изменяет настройки метрики времени задачи. |
| `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/enable` | EnableWorkitemTimeMetric | `teamstorm_task_time_metrics_enable` | Подключает к задаче метрику времени по шаблону. |
| `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/disable` | DisableWorkitemTimeMetric | `teamstorm_task_time_metrics_disable` | Отключает метрику времени у задачи. |
| `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/pause` | PauseWorkitemTimeMetric | `teamstorm_task_time_metrics_pause` | Приостанавливает отсчёт времени метрики. |
| `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/resume` | ResumeWorkitemTimeMetric | `teamstorm_task_time_metrics_resume` | Возобновляет отсчёт времени приостановленной метрики. |
| `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/start` | StartWorkitemTimeMetric | `teamstorm_task_time_metrics_start` | Запускает отсчёт времени метрики. |
| `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/stop` | StopWorkitemTimeMetric | `teamstorm_task_time_metrics_stop` | Завершает метрику времени. |

Added schema keys: `EnableWorkitemTimeMetricRequestBody`, `EnableWorkitemTimeMetricResponseBody`, `UpdateWorkitemTimeMetricSettingsRequestBody`, `WorkCalendarModel`, `WorkCalendarModelList`, `WorkitemTimeMetricModel`, `WorkitemTimeMetricModelList`, `WorkitemTimeMetricStatus`, `WorkitemTimeMetricTemplateModel`, `WorkitemTimeMetricTemplateModelList`, `WorkitemTimeMetricTemplateType`.

Enable takes required `templateId` plus optional `type`, `limitSeconds`, `approachThresholdPercent`, `workCalendarId`, `initialSpentSeconds`. PATCH settings accepts optional `type`, `limitSeconds`, `approachThresholdPercent`, `workCalendarId`, `spentSeconds`; neither substitutes for creating a manual worklog entry.

`WorkitemTimeMetricModel` declares all 13 keys required: `id`, `workitemId`, `templateId`, `name`, `type`, `limitSeconds`, `approachThresholdPercent`, `workCalendarId`, `status`, `elapsedSeconds`, `isTicking`, `approachAt`, `breachAt`. **approachAt and breachAt are required keys with nullable date-time values**. Required does not mean non-null. Status enum: NotStarted, InProgress, Approaching, Paused, Breached, CompletedInTime, CompletedBreached, Disabled; template type: Sla, Ola, Custom. Metric/template/calendar list wrappers contain `items` without pagination parameters.

`WorkCalendarModel` has required `id`, `name`, `timeZone`, `modifiedDate`; template lookup returns required `id`, `name`, `type`. Resolve these IDs before enabling/overriding metrics. State-changing responses must be read from the pinned operation: do not assume every POST/PATCH returns a full metric model.

## Full audit findings and dispositions

Source group/item IDs below preserve all findings from the six read-only audits. **Confirmed** means a documented comparison/check, not a production failure. The recovered code batch and subsequent corrections are integrated: LinkType.key is optional nullable, link requests default linkedWorkspace client-side, and unsupported CREATE storyPoints is removed at both the TypeScript and MCP boundaries. Compatibility decisions override earlier audit recommendations.

### Group 1 — Workitems core

Source: `audit-1-workitems-core.md` in the audit workspace.

| ID (audit: CONFIRMED) | Endpoint/model | Finding and evidence boundary | Disposition |
| --- | --- | --- | --- |
| G1-C1 | CreateWorkitemLink | Missing linkedWorkspace; newly added property and required key in the historical contract diff. | Task 2a added optional input (R2); R10 supersedes the omission/defaulting premise: client must send explicit value or resolved source workspace. Implemented in accepted Task 2b (R10): client sends explicit linkedWorkspace or resolved source workspace; MCP input stays optional. |
| G1-C2 | ListSharedWorkitemPermissions | Spec response is a bare array of permission variants; old client returned an items-wrapper type. | The client now returns the bare permission array; the tool consumes it and emits its own items/count structured result. Wrapped API responses are not normalized or claimed supported. Mocked shape handling is verified; no live 4.2x payload proof. |
| G1-C3 | WorkitemModel.folder / parent | FolderThumbModel is id/name, TreeNodeThumbModel is id/nodeType. One shared client type invented nodeType on folder and required name on parent. | Task 2a separates thumb types; parent keeps optional legacy name and schema-required nodeType, widened enum per R4, and guards display fallbacks. Loose requiredness remains a compatibility choice pending live verification. |
| G1-C4 | CommentModel (task comments) | Missing required visibilityType: All / Workspace / OnlySelected / ExceptSelected. | Task 2a adds the shared field and optional task-comment projection. Duplicate of G3-C3; default task-comment projection still excludes it (deferred review note). |
| G1-C5 | ListWorkitemAttributes | AttributeValueModelList has only items; the client invented required pagination fields. | Task 2b B1 removes phantom fields; Implemented in accepted Task 2b. |
| G1-C6 | CreateWorkitem.parentId | Client permits omission; both historical and pinned schemas require parentId. | R3 retains the optional client type; the MCP create tool already requires parentId. Possible server defaulting is a hypothesis requiring a live creation check; this requirement did not first appear in 4.2x. |
| G1-C7 | CreateWorkitem.storyPoints | CREATE body has no storyPoints and forbids additional properties; PATCH has it. | Removed from the CREATE request type and strict MCP schema; PATCH support remains. Set Story Points with teamstorm_tasks_update after creation. |
| G1-C8 | CreateWorkitem.startDate | Optional nullable date-time property missing in old client; genuinely added since June baseline. | Task 2b B15 adds optional nullable startDate to request type and MCP creation input; Implemented in accepted Task 2b. |
| G1-C9 | WorkitemModelList / updates list | Pagination fromToken/maxItemsCount/nextToken are optional; client required all three. | Task 2b B5 relaxes pagination optionality/nullability; Implemented in accepted Task 2b. |
| G1-C10 | WorkitemModel / changeDate | Client over-required description/type/workflow/status/createdDate/originalEstimate/timeSpent/remainingEstimate/storyPoints/changedBy, and update changeDate; folder/parent are looser than spec. | Task 2b B6 relaxes named over-required fields to optional nullable with minimal compile fixes (R6/R9); folder/parent compatibility looseness retained. Implemented in accepted Task 2b. |
| G1-C11 | LinkTypeModel / PrincipalModel / permission type | LinkType.key should be optional nullable (pinned key has nullable: true); principal accessList[].type and task-permission type are schema-required discriminators. | B10 implemented. After review corrected the audit/brief’s nullability misread, B9 now accepts omission/string/null in its type and compile-time fixtures. Shared with G5-C9. |

### Group 2 — Attachments

Source: `audit-2-attachments.md` in the audit workspace.

| ID (audit: CONFIRMED) | Endpoint/model | Finding and evidence boundary | Disposition |
| --- | --- | --- | --- |
| G2-C1 | UploadWorkitemAttachments follow-up lookup | Client compared locally generated attachment identity against storage fileId and OR-ed a filename match; duplicate filenames can select the old record in a mocked scenario. | Task 2a prefers attachmentId correlation, then retains name fallback after review. Mocked duplicate-name case covered. Whether live upload round-trips attachmentId still needs verification; no verified production failure asserted. |

### Group 3 — Documents

Source: `audit-3-documents.md` in the audit workspace.

| ID (audit: CONFIRMED) | Endpoint/model | Finding and evidence boundary | Disposition |
| --- | --- | --- | --- |
| G3-C1 | CreateDocument | Spec requires name/content/parentId/labels; client/tool required only name. Requiredness already present in June baseline. | Task 2a sends labels: [] when absent (R7); content/parentId inputs stay optional with API-required descriptions. Live omission/defaulting behaviour remains unverified. |
| G3-C2 | DocumentModel.parent | Spec thumb has id/nodeType and no name; formatter relied on parent.name. Required/nullable client declarations also differ. | Task 2a uses name then schema-provided nodeType, retains optional legacy name and schema-required nodeType, and fixes parent projection. Prevents undefined rendering for a spec-shaped/mock payload; not a verified live bug. |
| G3-C3 | CommentModel (document comments) | Shared visibilityType field absent; repeats task-comment finding G1-C4. | Task 2a shared type adds it; document comment structured output already passes raw models. Count once as a capability, retain both audit rows. |
| G3-C4 | DocumentsStatusModelList | Client invented optional pagination fields; spec/status list has only items and no paging query. | Task 2b B2 removes phantom pagination; Implemented in accepted Task 2b. |
| G3-C5 | SharedDocumentPermission variants | Client flat userId/groupId response fields belong to request bodies; response variants embed user/group. | Task 2b B3 removes flat IDs and minimally updates formatter fallback; Implemented in accepted Task 2b. |
| G3-C6 | PatchSharedDocumentPermissionBody | Client method disallowed empty/null accessLevel although schema permits optional nullable value. | Task 2b B11 widens client body; MCP update input remains required concrete accessLevel. Implemented in accepted Task 2b. |

### Group 4 — Folders and portfolios

Source: `audit-4-folders-portfolios.md` in the audit workspace.

| ID (audit: CONFIRMED) | Endpoint/model | Finding and evidence boundary | Disposition |
| --- | --- | --- | --- |
| G4-C1 | FolderModel.parentId | Schema required/non-null parentId conflicts with client optional/null and root-folder truthy checks. Same requirement existed in June. | R1 retains parentId?: string \| null. Root omission/null is a compatibility hypothesis, not proof of a spec defect; live check pending. |

### Group 5 — Reference data

Source: `audit-5-reference-data.md` in the audit workspace.

| ID (audit: CONFIRMED) | Endpoint/model | Finding and evidence boundary | Disposition |
| --- | --- | --- | --- |
| G5-C1 | ListAttributes | Client reused attribute-value family (value) instead of definitions (workitemTypes/options); unsafe cast hid the mismatch. | Task 2a uses AttributeModel definition list/type and removes cast; workitemTypes optional guard restored in review. |
| G5-C2 | WorkflowModel | Missing type (Workitem/Portfolio), statuses and transitions; client represented only id/name/description. | Task 2b B13 adds workflow graph fields and subtypes; Implemented in accepted Task 2b. |
| G5-C3 | TypeModel | Missing attributes/color/workflow/estimatesInTime/estimatesInStoryPoints/showTimeTracking; icon optional although schema-required enum. | Task 2b B14 adds fields, transcribes TypeColor; TypeIcon deliberately represented as string (incomplete enum validation). Implemented in accepted Task 2b. |
| G5-C4 | WorkspaceModel | description/author are optional nullable, client required non-null values. | Task 2b B7 relaxes both; potential missing-value risk is contract-based, not a reproduced live exception. Implemented in accepted Task 2b. |
| G5-C5 | WorkspaceModelList.items | Inline client items discarded description/author despite sharing WorkspaceModel with getWorkspace. | Task 2b B8 unifies list item type with full workspace model; Implemented in accepted Task 2b. |
| G5-C6 | AttributesModelList pagination | Definition list pagination optional; old reused value-list type made it required. | Task 2a definition-list type supplies optional pagination. Related to G5-C1; not G1-C5, whose value list has no pagination at all. |
| G5-C7 | GetWorkspaceUsers | Missing query displayName/roleId/fromToken/maxItemsCount plus workspace pagination fields; global UsersModelList is unpaginated. | Task 2b B16/B17 separates workspace response and adds query params. Historical swapped-schema attribution already corrected. Implemented in accepted Task 2b. |
| G5-C8 | PatchAttributeOptionModel.id | Spec requires nullable id key; client allowed omitted key but not null. | Task 2b B12 implements R8: id?: string \| null, retaining omission compatibility hypothesis. Implemented in accepted Task 2b. |
| G5-C9 | LinkTypeModel.key | Client required nullable key; pinned schema key is optional AND nullable. Original audit/brief incorrectly claimed non-nullability. Duplicate/shared with G1-C11. | Post-review correction: key?: string \| null; fixture must accept null instead of claiming the spec rejects it. Implemented and verified by typecheck and compile-time fixtures accepting omission, string and null. This is a type-contract correction, not a live API bug. |
| G5-C10 | ListWorkspaces | Missing public key/name query filters. | Task 2b B18 threads filters through client/MCP input; Implemented in accepted Task 2b. |
| G5-C11 | ListWorkflows | Missing public name query filter. | Task 2b B19 threads name through client/MCP input; Implemented in accepted Task 2b. |
| G5-C12 | ListAttributes queries | Client accepted arbitrary type string and lacked isFullNameMatching boolean. | Task 2b B20 constrains seven-member AttributeType and adds full-name filter; Implemented in accepted Task 2b. |

### Group 6 — Time tracking

Source: `audit-6-time-tracking.md` in the audit workspace.

| ID (audit: CONFIRMED) | Endpoint/model | Finding and evidence boundary | Disposition |
| --- | --- | --- | --- |
| G6-C1 | Private listTimeEntries / createTimeEntry | Private /tasks/api/v1/workitems/{id}/time-tracking-entries path absent in both available public specs. A known out-of-spec integration, not new drift. | Keep private list/create. Public API has no entry POST and no workitem/workspace filter; private contract cannot be inferred from public schemas. |
| G6-C2 | Public base URL derivation | All 104 pinned paths retain /cwm/public/api/v1; suffix stripping still matches. Audit records an unchanged check, not a defect. | No migration required. A hypothetical future prefix change is outside this sync; no new runtime fix attributed. |

## Suspected findings and live-verification questions

| ID / source classification | Question | Disposition and evidence needed |
| --- | --- | --- |
| G1-S1 — SUSPECTED | Does server default linkedWorkspace or create parentId when omitted? | LinkedWorkspace requiredness is newly proved by the baseline; R10 sends resolved source workspace rather than assuming defaulting. ParentId input stays optional under R3. No live 4.2x proof of either default; check same/cross-workspace links and task creation responses in an authorized test workspace. |
| G1-S2 — SUSPECTED | Does parent.nodeType emit Task or legacy WorkItem? | R4 admits Folder/Task/WorkItem/Workspace/Document and retains optional legacy name and schema-required nodeType. Inspect raw parent JSON for a task with a task parent; do not infer emitted values from union widening. |
| G3-S1 — SUSPECTED | Does GetDocumentWorkitemLinks populate folder/parent/type/workflow/status/estimates as the shared task type assumed? | Shared Task 2b optionality fixes mitigate declared guarantees but do not validate this endpoint live. Inspect a document with linked tasks; retain compatibility fields and verify absent/null cases. |
| G4-S1 — SUSPECTED | Do workspace-root folders omit/null parentId despite required/non-null schema? | R1 keeps loose type/root checks; inspect list/get of known root folder. Code checks suggest intent, not proof the spec is wrong. |
| G5-S1 — SUSPECTED | Does AddAttributeOption accept omitted id? | R5 keeps optional id because pinned required list contradicts field description (“Необязательный идентификатор варианта”). Check a create-option request with name only; neither live acceptance nor rejection is proved. |

Additional questions raised in audit coverage/replacement notes are not counted in those five formal SUSPECTED entries:

| Question / source | Disposition |
| --- | --- |
| Attachment identity after upload (G2-C1 and review) | Prefer attachmentId then name fallback; verify UUID round-trip live before removing fallback. Mock correlation is not proof of server storage identity. |
| GetDocumentAttachmentWithVersions wrapper (group 2 coverage note) | Spec uses AttachmentModelList whereas task counterpart uses AttachmentModel. Unimplemented; inspect live shape before a future document-version tool, do not label it a confirmed spec bug. |
| Download success body/Content-Disposition (group 2, existing docs) | Pinned spec documents no success schema. Existing OOB tools stage bytes; actual filename/filename* headers and byte MIME semantics still require live check. Preserve arraybuffer error decoding. |
| Public TimeTrackingEntry.spentTime unit (group 6) | Spec says spent time without a unit; private duration uses seconds. Do not infer that public spentTime necessarily shares this unit; verify against a known logged duration. |
| GetTimeTrackingEntriesUpdates date-window meaning (group 6) | Spec does not settle business date versus createdAt/updatedAt/deletedAt semantics. Leave unimplemented pending live/schema clarification; possible future separate delta-feed tool with withDeleted, not a mode of period reporting. |
| Private worklog request/response drift (group 6) | Neither public baseline describes private /tasks/api/v1. No schema-based conclusion about private runtime correctness; preserve private list/create. |
| CreateDocument optional content/parentId and labels default (group 3 / R7) | labels now supplied as []; input looseness is preserved. Live success/defaulting/rejection of omitted content/parentId remains unverified. |

Historical notes in AGENTS.md about links, portfolio pin empty-body fallback and workspace author-record failures remain historical observations; this sync did not reverify them on 4.2x. Assertions in early rulings that code checks “prove” runtime behaviour are replaced here with compatibility hypotheses. R10 explicitly corrects R2’s unsupported premise about linkedWorkspace omission.

## Bounded fixes and remaining accuracy issues

Task 2b implemented all B1–B20 without deferral under R9; subsequent review corrections retain nullable key values and explain client-side linkedWorkspace defaulting. This is not global contract conformance: task folder/parent remain optional; nullable annotations on already-optional startDate/endDate/dueDate/assignee/sprint and embedded sprint typing remain outside the named B6 batch. Separate TypeThumbModel/WorkflowThumbModel prevent full-definition fields from being required in embedded tasks. CREATE storyPoints is removed from both the request type and strict MCP schema because the pinned CREATE body forbids it. Existing callers using that unsupported input must set it through teamstorm_tasks_update after creation. R1/R3/R5/R8 omissions retain compatibility hypotheses requiring live verification. Task-comment visibilityType remains selectable but excluded from its default projection. These boundaries must not be described as fully corrected request/response validation.

## Public period worklog tool (existing endpoint, implemented)

Registered public MCP name: `teamstorm_time_entries_list_by_period` over `GetTimeTrackingEntries` (`GET /cwm/public/api/v1/workspaces/time-tracking-entries`). This endpoint was already in June’s public spec; it is **not** one of the eleven added endpoints. Required `startDate`, optional `endDate`, `users` (comma-separated user logins), `fromToken`, `maxItemsCount` (1–1000, default 50), plus usual tool `apiUrl`. **Instance-wide within token visibility: no workspace input/filter, no workitem filter.** A consumer can filter embedded `workitem.id/key/workspace` locally only after fetching pages.

Response: `TimeTrackingModelList` with required `items` and optional nullable pagination fields; full `TimeTrackingEntryModel` includes `id`, `date`, `spentTime`, `description`, `createdAt`, `updatedAt`, `deletedAt`, `deleteUserId`, `deleteUser`, `workitem`, `author`, optional nullable `type`. Several required keys allow null. The tool uses bounded projected output: compact task/workspace/user references, raw spentTime without an assumed unit, and null deletion/type metadata. Dates require valid ISO 8601 with a timezone; UTC is recommended. API pages default to 50; output defaults to 50 and caps at 200, with a 256 KiB byte budget. If truncatedByCap or truncatedByBytes is true, refetch the current page with a smaller maxItemsCount before using nextToken, which belongs to the full API page.

Keep `teamstorm_time_entries_list` and `teamstorm_time_entries_create` on private GET/POST `/tasks/api/v1/workitems/{id}/time-tracking-entries`. Public period GET cannot replace per-task all-history reads, and no public POST creates an entry. The public updates endpoint remains a separate unimplemented capability pending date semantics verification.

## Public surface not exposed through MCP, by tag

**75 covered / 95 unexposed** operations, including exactly **11 coming soon**. Entity DELETE remains excluded; the existing portfolio unpin DELETE is implemented and counted. A client-only deleteTask is not MCP exposure.

| Tag | Unexposed / total | Operations (operationId or exact method/path if missing) | What exposure would buy / disposition |
| --- | ---: | --- | --- |
| Agile | 1 / 4 | `DeleteAgile` | Board deletion; entity-delete policy excludes it. |
| Attributes | 3 / 8 | `DeleteAttribute`, `DeleteAttributeOption`, `GetAttribute` | Fetch one attribute definition; entity/option deletes excluded. GetAttribute corrected from old false positive. |
| DocumentAttachments | 7 / 9 | `DeleteDocumentAttachments`, `DeleteDocumentAttachment`, `DeleteDocumentAttachmentVersion`, `GetDocumentAttachmentsWithVersions`, `GetDocumentAttachment`, `GetDocumentAttachmentWithVersions`, `UploadDocumentAttachments` | Single metadata, attachment/version reads and upload for documents; deletes excluded. Check version wrapper before implementation. |
| DocumentComments | 1 / 3 | `DeleteDocumentComment` | Comment deletion; destructive-delete policy excludes it. |
| DocumentLinks | 1 / 4 | `DeleteDocumentWorkitemLink` | Detach document/task associations; not requested/exposed, preserve current boundary. |
| DocumentVersions | 3 / 3 | `DeleteDocumentVersion`, `ListDocumentVersions`, `GetDocumentByVersion` | History listing and historical page reads; entity/version delete excluded. |
| Documents | 1 / 7 | `DeleteDocument` | Document deletion; entity-delete policy excludes it. |
| DocumentsSharing | 1 / 4 | `DeleteSharedDocumentPermission` | Revoke document sharing; not exposed. |
| Folders | 1 / 5 | `DeleteFolder` | Folder deletion; entity-delete policy excludes it. |
| GitIntegrationTokens | 6 / 6 | `DeleteTokenAsync`, `ListTokens`, `GetToken`, `CreateToken`, `UpdateToken`, `RefreshToken` | Manage integration tokens/refresh; entire tag unexposed, credentials/admin surface. |
| OpenId | 4 / 4 | `DeleteConnection`, `GetConnections`, `CreateConnection`, `CreateUser` | Manage authentication connections/create users; entire tag unexposed, administrative surface. |
| PortfolioElements | 1 / 7 | `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` | Element entity deletion excluded; pin/unpin already implemented and counted. |
| Portfolios | 1 / 5 | `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` | Portfolio entity deletion excluded. |
| Providers | 1 / 1 | `GetProviders` | Discover authentication providers. |
| Queries | 3 / 3 | `ListQueryWorkitems`, `GetQueryVisibilitySettings`, `UpdateQueryVisibilitySettings` | Saved query results and visibility settings; entire tag unexposed. |
| Roles | 5 / 5 | `DeleteRole`, `ListRoles`, `GetRole`, `PatchRole`, `CreateRole` | Discover/manage role definitions; entire tag unexposed, administrative surface. |
| Sprints | 2 / 5 | `DeleteSprint`, `PatchSprint` | Edit sprint parameters; entity-delete policy excludes deletion. |
| Statuses | 1 / 3 | `CreateStatus` | Create workspace task status (listing/get already covered). |
| TimeTracking | 1 / 2 | `GetTimeTrackingEntriesUpdates` | Separate change/deletion sync feed; date semantics require live verification. Period reporting is implemented. |
| Types | 6 / 7 | `DeleteType`, `DeleteTypeAttribute`, `GetType`, `PatchType`, `CreateType`, `AddTypeAttribute` | Get/create/edit type and associate attributes; entity/association deletion stays unexposed. |
| UserGroups | 2 / 2 | `ListUserGroups`, `GetUserGroup` | Discover groups and their members; entire tag unexposed. |
| Users | 2 / 4 | `BlockUser`, `UnblockUser` | Block/unblock users; administrative operations intentionally unexposed. |
| WorkCalendars | 1 / 1 | `GetWorkCalendars` | COMING SOON: global calendar IDs/time zones for metrics. |
| Workflows | 4 / 5 | `DeleteWorkflow`, `GetWorkflow`, `PatchWorkflow`, `CreateWorkflow` | Get/create/edit state machines; entity deletion excluded; existing list exposes graph fields. |
| WorkitemAttachments | 3 / 9 | `DeleteWorkitemAttachments`, `DeleteWorkitemAttachment`, `DeleteWorkitemAttachmentVersion` | Destructive attachment/version deletion excluded; existing list/get/version/upload/download covered. |
| WorkitemAttributes | 1 / 2 | `UpdateWorkitemAttribute` | Set individual task attribute value via PUT; definition CRUD does not cover this operation. |
| WorkitemComments | 3 / 6 | `DeleteWorkitemComment`, `UpdateWorkitemComment`, `UpdateWorkitemCommentVisibilitySettings` | Edit comments and visibility; comment deletion excluded. |
| WorkitemLinks | 1 / 3 | `DeleteWorkitemLink` | Remove task link; currently unexposed association delete. |
| WorkitemTimeMetricTemplates | 1 / 1 | `GetWorkitemTimeMetricTemplates` | COMING SOON: workspace template IDs needed to enable metrics. |
| WorkitemTimeMetrics | 9 / 9 | `GetWorkitemTimeMetrics`, `GetWorkitemTimeMetric`, `UpdateWorkitemTimeMetricSettings`, `EnableWorkitemTimeMetric`, `DisableWorkitemTimeMetric`, `PauseWorkitemTimeMetric`, `ResumeWorkitemTimeMetric`, `StartWorkitemTimeMetric`, `StopWorkitemTimeMetric` | COMING SOON: inspect, configure and control SLA/OLA/custom clocks (all nine operations). |
| Workitems | 1 / 8 | `DeleteWorkitem` | Entity deletion excluded; deleteTask exists in client only. |
| WorkitemsSharing | 3 / 4 | `DeleteSharedWorkitemPermission`, `PatchSharedWorkitemPermission`, `CreateSharedWorkitemPermission` | Grant/edit/revoke task access; reading existing permissions already covered. |
| WorkspaceGroups | 6 / 6 | `RemoveWorkspaceGroup`, `RemoveRoleForGroup`, `FilterWorkspaceUsers`, `GetGroupRoles`, `AddWorkspaceGroup`, `AddGroupRole` | Group membership/roles; entire tag unexposed, administrative surface. |
| WorkspaceUsers | 5 / 6 | `RemoveWorkspaceUser`, `RemoveRoleForUser`, `GetUserRoles`, `AddWorkspaceUser`, `AddUserRole` | User membership and role assignments/listing; administrative surface, deletes unexposed. |
| Workspaces | 3 / 5 | `DeleteWorkspace`, `PatchWorkspace`, `CreateWorkspace` | Create/edit workspace; entity deletion excluded. |

The three fully covered tags are `DocumentsStatuses`, `LinkTypes` and `StatusCategories`. Full method/path identities, preserved endpoint annotations and all eight missing operationIds are in [`openAPI-coverage-report.md`](../openAPI-coverage-report.md). No missing ID is fabricated.

## Compatibility decisions

These are client compatibility choices, not assertions about live server defaults.

| Decision | Final behaviour | Remaining cost or limitation |
| --- | --- | --- |
| R1 | Folder parentId stays optional nullable. | Looser than schema; root-folder response needs live verification. |
| R2 / R10 | linkedWorkspace input stays optional; client always sends explicit value or source workspace. | R10 supersedes the unverified server-default premise. |
| R3 | Client task-create parentId stays optional; MCP create already requires it. | Direct client omissions may be rejected by API. |
| R4 | Parent accepts schema node types plus legacy WorkItem and optional name; display prefers name then nodeType. | Union is deliberately wider than schema. |
| R5 | Attribute-option create id stays optional because the required list and description disagree. | Omission may fail server validation. |
| R6 / R9 | Relax selected response fields; minimally adapt consumers without a broad formatter rewrite. | Remaining model inaccuracies are listed above. |
| R7 | Document creation sends labels: [] when absent; content/parentId MCP inputs remain optional with API-required descriptions. | Server defaults for omitted content/parentId are unverified. |
| R8 | Patch attribute-option id accepts omission or null. | Schema requires presence; retained omission may be rejected. |
| CREATE Story Points | Remove unsupported CREATE field; retain supported PATCH field. | Existing callers must use tasks_update after creation. |
| Public period output | Require timezone-valid dates; bound descriptions and references; preserve raw spentTime and deletion metadata. | No inferred duration unit or server-side task/workspace filter; heed page-truncation guidance. |

## Coverage method and verification

**123 / 190 named schemas** are reachable from implemented public request/response contracts; **67** are not reached. The public period tool adds TimeTrackingModelList, TimeTrackingEntryModel and TimeTrackingEntryTypeModel to the previous 120. Counts recursively follow request/all-response refs, including errors and nested unions. They do not count TypeScript interfaces or guarantee complete field support; see the coverage report for the exact method and all 190 rows. The old 75/179 attribution is not methodologically comparable.

Runtime registration of all six TOOLSETS confirms **81 unique tools**: tasks 28, documents 18, portfolios 11, planning 7, structure 8, reference 9. Prompts/resources remain four/three and are not counted as tools.

Test execution coverage: statements/lines 67.42%, branches 72.70%, functions 72.29%; see [test coverage report](test-coverage-report.md). Generated V8 HTML/JSON were refreshed locally.

Final checks: npm run typecheck, npm run lint, npm run build and npm run test:run all pass; **333 tests in 33 files**. Tests use mocked TeamStorm responses, including real MCP transport calls for the new period tool. The upload-handler tests require local-port permission; sandbox listen EPERM is an execution restriction rather than a code defect. Endpoint and schema inventories were independently checked against the spec and MCP call graph. Live compatibility questions above remain open.
