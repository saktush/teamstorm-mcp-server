# TeamStorm OpenAPI → MCP Coverage Report

Updated: 2026-09-17. Authority: [`api-v1-4.2x.yaml`](api-v1-4.2x.yaml), OpenAPI 3.0.4.

## Summary

| Measure | Verified total |
| --- | ---: |
| Public operations | 170 |
| MCP-covered operations | 75 (44.1%) |
| Not covered, including coming soon | 95 |
| Coming soon (subset of not covered) | 11 |
| Component schemas | 190 |
| Reachable request/response schemas | 123 (64.7%) |
| Unreachable schemas by this method | 67 |
| Registered MCP tools | 81 |
| Paths / tags / operations without operationId | 104 / 38 / 8 |

Test execution coverage is tracked separately in [test-coverage-report.md](docs/test-coverage-report.md); it does not change operation or schema counts.

## Counting methodology

- An endpoint is the exact HTTP method + full public path. Count each once, even when several tools call it or a composite tool uses it internally. Inspect all six `TOOLSETS` arrays and register their functions in a fresh `McpServer` without executing tools; this gives actual unique tool names and per-set sizes. Client-only methods and private APIs are not public MCP coverage. Prompts/resources do not add tools or operations.
- Checked method/path identities were independently matched against the HTTP calls reached from registered MCP tools: all 75 match exactly, including composite helper calls. The old checklist had 159 rows and 75 checks. Correct the false positive `GetAttribute` (-1), then add public `GetTimeTrackingEntries` (+1): 75 endpoints of the new 170. `DeleteWorkitem` has a client method but no MCP tool.
- Entity deletion remains excluded. The implemented portfolio **unpin** DELETE (`teamstorm_portfolio_links_remove`) removes an association, not an entity, and is counted. Older annotations saying "no delete tools" refer to the entity/destructive-delete policy, with this exception.
- Exactly 11 method/path pairs absent from the old checklist are marked **COMING SOON (planned)**. They are unimplemented and included in the not-covered total. The newly implemented period tool covers an existing API endpoint and is not one of those 11 additions.
- Missing `operationId` is displayed as `(missing in pinned spec)`, never invented. All eight portfolio operations without IDs still count by method/path.
- Schema coverage means **contract reachability**, not complete TypeScript/Zod validation or field projection. For every checked endpoint, recursively collect local `$ref`s from `requestBody` and **all responses**, all media types, including error bodies. Resolve every local pointer, traverse referenced components and nested `properties`, `items`, `allOf`, `oneOf`, `anyOf`, etc.; use a visited-ref set for cycles. Count the union of reached `#/components/schemas/<name>` against all 190 component schema keys. Parameter-only refs are excluded. `ErrorModel` counts because error responses reference it. Inline binary bodies do not create named schemas.
- Each schema row below gives one reproducible endpoint witness when reachable. A reached schema does not imply every request alternative or response property is available in an MCP tool. Private worklog models are excluded. The previous schema checklist used a different, incomplete attribution method; its 75/179 figure is not comparable to this transitive count.

## Endpoints by Tag

### Agile

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — operationId: DeleteAgile — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/agile/list` — operationId: GetAgileExtensions — MCP tool: `teamstorm_agile_boards_list` (also used internally by `teamstorm_sprints_create`'s folder→agile resolver)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — operationId: GetAgile — MCP tool: `teamstorm_agile_boards_get`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/agile` — operationId: CreateAgile — MCP tool: `teamstorm_agile_boards_create` (note: request body has no `name` field — server derives it)

### Attributes

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: DeleteAttribute — NOT IMPLEMENTED (intentionally: no delete tools)
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options/{optionId}` — operationId: DeleteAttributeOption — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/attributes` — operationId: ListAttributes — MCP tool: `teamstorm_attributes_list`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: GetAttribute — NOT IMPLEMENTED — corrected old false positive: `teamstorm_attributes_get` calls `ListWorkitemAttributes`, not this path
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: PatchAttribute — MCP tool: `teamstorm_attributes_update`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options` — operationId: PatchAttributeOption — MCP tool: `teamstorm_attributes_update_option`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/attributes` — operationId: CreateAttribute — MCP tool: `teamstorm_attributes_create`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options` — operationId: AddAttributeOption — MCP tool: `teamstorm_attributes_add_option`

### DocumentAttachments

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments` — operationId: DeleteDocumentAttachments — NOT IMPLEMENTED (intentionally: no delete tools)
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}` — operationId: DeleteDocumentAttachment — NOT IMPLEMENTED (intentionally: no delete tools)
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: DeleteDocumentAttachmentVersion — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments` — operationId: GetDocumentAttachments — MCP tool: `teamstorm_document_attachments_list`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/versions` — operationId: GetDocumentAttachmentsWithVersions — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}` — operationId: GetDocumentAttachment — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/download` — operationId: DownloadDocumentAttachments — MCP tool: `teamstorm_document_attachments_download` (same out-of-band download infra as `teamstorm_attachments_download`)
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: GetDocumentAttachmentWithVersions — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/upload` — operationId: UploadDocumentAttachments — NOT IMPLEMENTED

### DocumentComments

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments/{commentId}` — operationId: DeleteDocumentComment — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments` — operationId: ListDocumentComments — MCP tool: `teamstorm_document_comments_list`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments` — operationId: CreateDocumentComment — MCP tool: `teamstorm_document_comments_create`

### DocumentLinks

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: DeleteDocumentWorkitemLink — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: GetDocumentWorkitemLinks — MCP tool: `teamstorm_document_links_list_by_document`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/document-links` — operationId: GetWorkitemDocumentLinks — MCP tool: `teamstorm_document_links_list_by_task`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: CreateDocumentWorkitemLink — MCP tool: `teamstorm_document_links_create`

### DocumentVersions

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions/{documentVersion}` — operationId: DeleteDocumentVersion — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions` — operationId: ListDocumentVersions — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions/{documentVersion}` — operationId: GetDocumentByVersion — NOT IMPLEMENTED

### Documents

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: DeleteDocument — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents` — operationId: ListDocuments — MCP tool: `teamstorm_documents_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: GetDocument — MCP tool: `teamstorm_documents_get`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: PatchDocument — MCP tool: `teamstorm_documents_update`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents` — operationId: CreateDocument — MCP tool: `teamstorm_documents_create`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/block` — operationId: BlockDocument — MCP tool: `teamstorm_documents_block`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/unblock` — operationId: UnblockDocument — MCP tool: `teamstorm_documents_unblock`

### DocumentsSharing

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing/{permissionId}` — operationId: DeleteSharedDocumentPermission — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing` — operationId: ListSharedDocumentPermissions — MCP tool: `teamstorm_document_permissions_list`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing/{permissionId}` — operationId: PatchSharedDocumentPermission — MCP tool: `teamstorm_document_permissions_update`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing` — operationId: CreateSharedDocumentPermission — MCP tool: `teamstorm_document_permissions_create`

### DocumentsStatuses

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents-statuses` — operationId: ListDocumentStatuses — MCP tool: `teamstorm_document_statuses_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents-statuses/{status}` — operationId: GetDocumentsStatus — MCP tool: `teamstorm_document_statuses_get`

### Folders

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: DeleteFolder — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/folders` — operationId: ListFolders — MCP tool: `teamstorm_folders_list`, `teamstorm_folders_tree`, `teamstorm_folders_find`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: GetFolder — MCP tool: `teamstorm_folders_get`, `teamstorm_folders_find`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: PatchFolder — MCP tool: `teamstorm_folders_update`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/folders` — operationId: CreateFolder — MCP tool: `teamstorm_folders_create`

### GitIntegrationTokens

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: DeleteTokenAsync — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens` — operationId: ListTokens — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: GetToken — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens` — operationId: CreateToken — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: UpdateToken — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}/refresh` — operationId: RefreshToken — NOT IMPLEMENTED

### LinkTypes

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/link-types` — operationId: ListLinkTypes — MCP tool: `teamstorm_link_types_list`

### OpenId

- [ ] `DELETE /cwm/public/api/v1/open-id/connections/{connectionId}` — operationId: DeleteConnection — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/open-id/connections` — operationId: GetConnections — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/open-id/connections` — operationId: CreateConnection — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/open-id/connections/{connectionId}/users` — operationId: CreateUser — NOT IMPLEMENTED

### PortfolioElements

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: (missing in pinned spec) — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}/workitems/{workitem}` — operationId: (missing in pinned spec) — MCP tool: `teamstorm_portfolio_links_remove` (accepts portfolioElementId or portfolioElementName); implemented association-removal exception to entity-delete policy
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements` — operationId: ListPortfolioElements — MCP tool: `teamstorm_portfolio_elements_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: GetPortfolioElement — MCP tool: `teamstorm_portfolio_elements_get`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: (missing in pinned spec) — MCP tool: `teamstorm_portfolio_elements_update`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements` — operationId: (missing in pinned spec) — MCP tool: `teamstorm_portfolio_elements_create`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}/workitems/{workitem}` — operationId: (missing in pinned spec) — MCP tool: `teamstorm_portfolio_links_set` (accepts portfolioElementId or portfolioElementName)

### Portfolios

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` — operationId: (missing in pinned spec) — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolios` — operationId: ListPortfolios — MCP tool: `teamstorm_portfolios_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` — operationId: GetPortfolio — MCP tool: `teamstorm_portfolios_get`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` — operationId: (missing in pinned spec) — MCP tool: `teamstorm_portfolios_update`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolios` — operationId: (missing in pinned spec) — MCP tool: `teamstorm_portfolios_create`

### Providers

- [ ] `GET /cwm/public/api/v1/providers` — operationId: GetProviders — NOT IMPLEMENTED

### Queries

- [ ] `GET /cwm/public/api/v1/queries/{queryId}/workitems` — operationId: ListQueryWorkitems — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/queries/{queryId}/visibility` — operationId: GetQueryVisibilitySettings — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/queries/{queryId}/visibility` — operationId: UpdateQueryVisibilitySettings — NOT IMPLEMENTED

### Roles

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/roles/{roleId}` — operationId: DeleteRole — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/roles` — operationId: ListRoles — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/roles/{roleId}` — operationId: GetRole — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/roles/{roleId}` — operationId: PatchRole — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/roles` — operationId: CreateRole — NOT IMPLEMENTED

### Sprints

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: DeleteSprint — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/sprints` — operationId: ListSprints — MCP tool: `teamstorm_sprints_list` (also used by `teamstorm_sprints_get_backlog`, filtering `folderId` results for `isBacklog: true`)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: GetSprint — used internally by `teamstorm_tasks_get` (`client.getSprint`) to enrich the task's embedded sprint thumb; also now a standalone tool, `teamstorm_sprints_get` (adds a client-computed team capacity figure — not an API field)
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: PatchSprint — NOT IMPLEMENTED
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/sprints` — operationId: CreateSprint — MCP tool: `teamstorm_sprints_create` (resolves `folderId`→`agileId` via `GetAgileExtensions`)

### StatusCategories

- [x] `GET /cwm/public/api/v1/status-categories` — operationId: ListStatusCategories — MCP tool: `teamstorm_status_categories_list` (global endpoint, no `{workspace}` in path)

### Statuses

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/statuses` — operationId: ListStatuses — MCP tool: `teamstorm_workspace_statuses_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/statuses/{status}` — operationId: GetStatus — MCP tool: `teamstorm_workspace_statuses_get`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/statuses` — operationId: CreateStatus — NOT IMPLEMENTED

### TimeTracking

- [x] `GET /cwm/public/api/v1/workspaces/time-tracking-entries` — operationId: GetTimeTrackingEntries — MCP tool: `teamstorm_time_entries_list_by_period`; instance-wide within token access, required `startDate`, no workspace/workitem filter; compact bounded output, unspecified `spentTime` unit retained as raw number
- [ ] `GET /cwm/public/api/v1/workspaces/time-tracking-entries/updates` — operationId: GetTimeTrackingEntriesUpdates — NOT IMPLEMENTED

### Types

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: DeleteType — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/types/{type}/attributes/{attributeId}` — operationId: DeleteTypeAttribute — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/types` — operationId: ListTypes — MCP tool: `teamstorm_task_types_list`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: GetType — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: PatchType — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/types` — operationId: CreateType — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/types/{type}/attributes/{attributeId}` — operationId: AddTypeAttribute — NOT IMPLEMENTED

### UserGroups

- [ ] `GET /cwm/public/api/v1/user-groups` — operationId: ListUserGroups — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/user-groups/{group}` — operationId: GetUserGroup — NOT IMPLEMENTED

### Users

- [x] `GET /cwm/public/api/v1/users` — operationId: ListUsers — MCP tool: `teamstorm_users_list_all` (global, server-side filtered by displayName/email/username/providerId — distinct from workspace-scoped `teamstorm_users_list`)
- [x] `GET /cwm/public/api/v1/users/{user}` — operationId: GetUser — MCP tool: `teamstorm_users_get` (global, no workspace in path)
- [ ] `POST /cwm/public/api/v1/users/block/{userId}` — operationId: BlockUser — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/users/unblock/{userId}` — operationId: UnblockUser — NOT IMPLEMENTED

### WorkCalendars

- [ ] `GET /cwm/public/api/v1/work-calendars` — operationId: GetWorkCalendars — COMING SOON (planned) — proposed MCP tool: `teamstorm_work_calendars_list`

### Workflows

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: DeleteWorkflow — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workflows` — operationId: ListWorkflows — MCP tool: `teamstorm_workflows_list`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: GetWorkflow — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: PatchWorkflow — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workflows` — operationId: CreateWorkflow — NOT IMPLEMENTED

### WorkitemAttachments

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments` — operationId: DeleteWorkitemAttachments — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}` — operationId: DeleteWorkitemAttachment — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: DeleteWorkitemAttachmentVersion — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments` — operationId: GetWorkitemAttachments — MCP tool: `teamstorm_attachments_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/versions` — operationId: GetWorkitemAttachmentsWithVersions — MCP tool: `teamstorm_attachments_list_versions`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}` — operationId: GetWorkitemAttachment — MCP tool: `teamstorm_attachments_get`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/download` — operationId: DownloadWorkitemAttachments — MCP tool: `teamstorm_attachments_download` (out-of-band: saves to disk, returns a `GET /download/:id` URL — see AGENTS.md "Загрузка и скачивание файлов")
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: GetWorkitemAttachmentWithVersions — MCP tool: `teamstorm_attachments_get_version`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/upload` — operationId: UploadWorkitemAttachments — MCP tool: `teamstorm_attachments_attach_uploaded`

### WorkitemAttributes

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attributes` — operationId: ListWorkitemAttributes — MCP tool: `teamstorm_attributes_get`
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attributes/{attributeId}` — operationId: UpdateWorkitemAttribute — NOT IMPLEMENTED

### WorkitemComments

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — operationId: DeleteWorkitemComment — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments` — operationId: ListWorkitemComments — MCP tool: `teamstorm_comments_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}/visibility` — operationId: GetWorkitemCommentVisibilitySettings — MCP tool: `teamstorm_comments_get_visibility`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments` — operationId: CreateWorkitemComment — MCP tool: `teamstorm_comments_create`
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — operationId: UpdateWorkitemComment — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}/visibility` — operationId: UpdateWorkitemCommentVisibilitySettings — NOT IMPLEMENTED

### WorkitemLinks

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/links/{linkId}` — operationId: DeleteWorkitemLink — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/links` — operationId: ListWorkitemLinks — MCP tool: `teamstorm_task_links_list` (fixed 2026-07-17: response is a bare `WorkitemLinkModel[]` embedding the full linked workitem, not the previously-assumed `{items: [{id, linkType, source, target}]}` shape — verified against a live workspace)
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/links` — operationId: CreateWorkitemLink — MCP tool: `teamstorm_task_links_create` (accepts link type by id or by name/key, resolved via `teamstorm_link_types_list`)

### WorkitemTimeMetricTemplates

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/workitem-metric-templates` — operationId: GetWorkitemTimeMetricTemplates — COMING SOON (planned) — proposed MCP tool: `teamstorm_time_metric_templates_list`

### WorkitemTimeMetrics

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics` — operationId: GetWorkitemTimeMetrics — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_list`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}` — operationId: GetWorkitemTimeMetric — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_get`
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}` — operationId: UpdateWorkitemTimeMetricSettings — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_update`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/enable` — operationId: EnableWorkitemTimeMetric — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_enable`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/disable` — operationId: DisableWorkitemTimeMetric — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_disable`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/pause` — operationId: PauseWorkitemTimeMetric — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_pause`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/resume` — operationId: ResumeWorkitemTimeMetric — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_resume`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/start` — operationId: StartWorkitemTimeMetric — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_start`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/workitem-time-metrics/{metricId}/stop` — operationId: StopWorkitemTimeMetric — COMING SOON (planned) — proposed MCP tool: `teamstorm_task_time_metrics_stop`

### Workitems

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: DeleteWorkitem — NOT IMPLEMENTED — `deleteTask` client method exists, deliberately unexposed through MCP (entity deletion policy)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems` — operationId: ListWorkitems — MCP tool: `teamstorm_tasks_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/by-parent/{parent}` — operationId: ListWorkitemsByParent — MCP tool: `teamstorm_tasks_list_by_parent`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/count` — operationId: GetWorkitemsCount — MCP tool: `teamstorm_tasks_count`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/updates` — operationId: ListWorkitemsUpdates — MCP tool: `teamstorm_tasks_list_updated`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: GetWorkitemById — MCP tool: `teamstorm_tasks_get`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: PatchWorkitem — MCP tool: `teamstorm_tasks_update`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems` — operationId: CreateWorkitem — MCP tool: `teamstorm_tasks_create`

### WorkitemsSharing

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing/{permissionId}` — operationId: DeleteSharedWorkitemPermission — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing` — operationId: ListSharedWorkitemPermissions — MCP tool: `teamstorm_task_permissions_get`
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing/{permissionId}` — operationId: PatchSharedWorkitemPermission — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing` — operationId: CreateSharedWorkitemPermission — NOT IMPLEMENTED

### WorkspaceGroups

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}` — operationId: RemoveWorkspaceGroup — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}/roles/{roleId}` — operationId: RemoveRoleForGroup — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/groups` — operationId: FilterWorkspaceUsers — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}/roles` — operationId: GetGroupRoles — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}` — operationId: AddWorkspaceGroup — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}/roles/{roleId}` — operationId: AddGroupRole — NOT IMPLEMENTED

### WorkspaceUsers

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/users/{userId}` — operationId: RemoveWorkspaceUser — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles/{roleId}` — operationId: RemoveRoleForUser — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/users` — operationId: GetWorkspaceUsers — MCP tool: `teamstorm_users_list` (response schema is actually `UserModelList`, not `UsersModelList` — corrected 2026-07-20, found while cross-checking schemas for the new global user tools)
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles` — operationId: GetUserRoles — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/users/{userId}` — operationId: AddWorkspaceUser — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles/{roleId}` — operationId: AddUserRole — NOT IMPLEMENTED

### Workspaces

- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}` — operationId: DeleteWorkspace — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces` — operationId: ListWorkspaces — MCP tool: `teamstorm_workspaces_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}` — operationId: GetWorkspace — MCP tool: `teamstorm_workspaces_get` (unverified live — may share the bare-list-endpoint author-record flakiness noted below)
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}` — operationId: PatchWorkspace — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces` — operationId: CreateWorkspace — NOT IMPLEMENTED

## Schema / Data Types Coverage

Contract reachability using the method above. All 190 schemas are enumerated; witnesses are operationIds, or exact method/path when the spec omits an ID.

- [x] `AgileModel` — reachable via `GetAgileExtensions`
- [x] `AntivirusScanVerdict` — reachable via `GetDocumentAttachments`
- [x] `AttachmentModel` — reachable via `GetDocumentAttachments`
- [x] `AttachmentModelList` — reachable via `GetDocumentAttachments`
- [x] `AttributeModel` — reachable via `ListAttributes`
- [x] `AttributeOptionModel` — reachable via `ListAttributes`
- [x] `AttributeType` — reachable via `ListAttributes`
- [x] `AttributeValueModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `AttributeValueModelList` — reachable via `ListWorkitemAttributes`
- [x] `AttributesModelList` — reachable via `ListAttributes`
- [x] `CommentModel` — reachable via `ListDocumentComments`
- [x] `CommentModelList` — reachable via `ListDocumentComments`
- [x] `CommentVisibilitySettingsModel` — reachable via `GetWorkitemCommentVisibilitySettings`
- [x] `CommentVisibilityType` — reachable via `ListDocumentComments`
- [x] `CreateAgileRequestBody` — reachable via `CreateAgile`
- [x] `CreateAttributeOptionModel` — reachable via `CreateAttribute`
- [x] `CreateAttributeOptionRequestBody` — reachable via `AddAttributeOption`
- [x] `CreateAttributeRequestBody` — reachable via `CreateAttribute`
- [x] `CreateAttributeValueRequestBody` — reachable via `CreateWorkitem`
- [x] `CreateCommentRequestBody` — reachable via `CreateDocumentComment`
- [x] `CreateDateFieldRequestBody` — reachable via `CreateWorkitem`
- [x] `CreateDocumentRequestBody` — reachable via `CreateDocument`
- [x] `CreateDocumentWorkitemLinkRequestBody` — reachable via `CreateDocumentWorkitemLink`
- [x] `CreateFolderRequestBody` — reachable via `CreateFolder`
- [x] `CreateNumberFieldRequestBody` — reachable via `CreateWorkitem`
- [ ] `CreateOpenIdConnectionModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `CreateOpenIdUserModel` — not reachable from currently MCP-covered request/response contracts
- [x] `CreatePortfolioElementRequestBody` — reachable via `POST /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements`
- [x] `CreatePortfolioRequestBody` — reachable via `POST /cwm/public/api/v1/workspaces/{workspace}/portfolios`
- [ ] `CreateRoleRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `CreateSharedDocumentGroupPermissionBody` — reachable via `CreateSharedDocumentPermission`
- [x] `CreateSharedDocumentPermissionBody` — reachable via `CreateSharedDocumentPermission`
- [x] `CreateSharedDocumentUserPermissionBody` — reachable via `CreateSharedDocumentPermission`
- [ ] `CreateSharedWorkitemGroupPermissionBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `CreateSharedWorkitemPermissionBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `CreateSharedWorkitemUserPermissionBody` — not reachable from currently MCP-covered request/response contracts
- [x] `CreateSprintRequestBody` — reachable via `CreateSprint`
- [ ] `CreateStatusRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `CreateTagFieldRequestBody` — reachable via `CreateWorkitem`
- [x] `CreateTimeFieldRequestBody` — reachable via `CreateWorkitem`
- [ ] `CreateTokenRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `CreateTransitionRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `CreateTypeRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `CreateUniSelectFieldRequestBody` — reachable via `CreateWorkitem`
- [x] `CreateUniStringFieldRequestBody` — reachable via `CreateWorkitem`
- [x] `CreateUserFieldRequestBody` — reachable via `CreateWorkitem`
- [x] `CreateUserFieldValueModel` — reachable via `CreateWorkitem`
- [ ] `CreateWorkflowRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `CreateWorkflowStatusRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `CreateWorkitemLinkRequestBody` — reachable via `CreateWorkitemLink`
- [x] `CreateWorkitemRequestBody` — reachable via `CreateWorkitem`
- [ ] `CreateWorkspaceRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `DateFieldValueModel` — reachable via `GetDocumentWorkitemLinks`
- [ ] `DeleteDocumentWorkitemLinkRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `DocumentModel` — reachable via `ListDocuments`
- [x] `DocumentStatusModel` — reachable via `ListDocuments`
- [ ] `DocumentVersionModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `DocumentVersionsModelList` — not reachable from currently MCP-covered request/response contracts
- [x] `DocumentsModelList` — reachable via `ListDocuments`
- [x] `DocumentsStatusModelList` — reachable via `ListDocumentStatuses`
- [ ] `EnableWorkitemTimeMetricRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `EnableWorkitemTimeMetricResponseBody` — not reachable from currently MCP-covered request/response contracts
- [x] `ErrorModel` — reachable via `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}/workitems/{workitem}`
- [x] `EstimatesType` — reachable via `GetAgileExtensions`
- [x] `FolderModel` — reachable via `ListFolders`
- [x] `FolderModelList` — reachable via `ListFolders`
- [x] `FolderThumbModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `GroupModel` — reachable via `ListSharedDocumentPermissions`
- [ ] `GroupModelList` — not reachable from currently MCP-covered request/response contracts
- [x] `GroupPrincipalModel` — reachable via `GetWorkitemCommentVisibilitySettings`
- [x] `LinkTypeModel` — reachable via `ListLinkTypes`
- [x] `LinkTypeModelList` — reachable via `ListLinkTypes`
- [x] `NumberFieldValueModel` — reachable via `GetDocumentWorkitemLinks`
- [ ] `OpenIdConnectionModel` — not reachable from currently MCP-covered request/response contracts
- [x] `OptionModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `PatchAttributeOptionModel` — reachable via `PatchAttribute`
- [x] `PatchAttributeOptionRequestBody` — reachable via `PatchAttributeOption`
- [x] `PatchAttributeRequestBody` — reachable via `PatchAttribute`
- [x] `PatchDocumentRequestBody` — reachable via `PatchDocument`
- [x] `PatchFolderRequestBody` — reachable via `PatchFolder`
- [x] `PatchPortfolioElementRequestBody` — reachable via `PATCH /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}`
- [x] `PatchPortfolioRequestBody` — reachable via `PATCH /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}`
- [ ] `PatchRoleRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `PatchSharedDocumentPermissionBody` — reachable via `PatchSharedDocumentPermission`
- [ ] `PatchSharedWorkitemPermissionBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `PatchSprintRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `PatchTransitionRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `PatchTypeRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `PatchWorkflowRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `PatchWorkflowStatusRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `PatchWorkitemRequestBody` — reachable via `PatchWorkitem`
- [ ] `PatchWorkspaceRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `Permission` — not reachable from currently MCP-covered request/response contracts
- [x] `PortfolioElementModel` — reachable via `ListPortfolioElements`
- [x] `PortfolioElementModelList` — reachable via `ListPortfolioElements`
- [x] `PortfolioElementThumbModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `PortfolioModel` — reachable via `ListPortfolios`
- [x] `PortfolioModelList` — reachable via `ListPortfolios`
- [x] `PortfolioThumbModel` — reachable via `ListPortfolioElements`
- [x] `PrincipalModel` — reachable via `GetWorkitemCommentVisibilitySettings`
- [x] `PrincipalType` — reachable via `GetWorkitemCommentVisibilitySettings`
- [x] `ProgressType` — reachable via `ListTypes`
- [ ] `ProviderModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `ProviderModelList` — not reachable from currently MCP-covered request/response contracts
- [ ] `ProviderType` — not reachable from currently MCP-covered request/response contracts
- [ ] `QueryVisibilitySettingsModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `QueryVisibilityType` — not reachable from currently MCP-covered request/response contracts
- [ ] `RoleModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `RolesModelList` — not reachable from currently MCP-covered request/response contracts
- [x] `SharedDocumentGroupPermissionModel` — reachable via `ListSharedDocumentPermissions`
- [x] `SharedDocumentPermissionModel` — reachable via `ListSharedDocumentPermissions`
- [x] `SharedDocumentUserPermissionModel` — reachable via `ListSharedDocumentPermissions`
- [x] `SharedItemAccessLevel` — reachable via `ListSharedDocumentPermissions`
- [x] `SharedItemAccessType` — reachable via `ListSharedDocumentPermissions`
- [x] `SharedWorkitemGroupPermissionModel` — reachable via `ListSharedWorkitemPermissions`
- [x] `SharedWorkitemPermissionModel` — reachable via `ListSharedWorkitemPermissions`
- [x] `SharedWorkitemUserPermissionModel` — reachable via `ListSharedWorkitemPermissions`
- [ ] `SimpleRoleModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `SimpleRoleModelList` — not reachable from currently MCP-covered request/response contracts
- [x] `SprintMemberRequestBody` — reachable via `CreateSprint`
- [x] `SprintModel` — reachable via `ListSprints`
- [x] `SprintModelList` — reachable via `ListSprints`
- [x] `SprintStates` — reachable via `ListSprints`
- [x] `SprintThumbModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `StatusCategoryModel` — reachable via `ListStatusCategories`
- [x] `StatusCategoryModelList` — reachable via `ListStatusCategories`
- [x] `StatusModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `StatusModelList` — reachable via `ListStatuses`
- [ ] `SystemRoles` — not reachable from currently MCP-covered request/response contracts
- [x] `TagFieldValueModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `TeamMemberModel` — reachable via `ListSprints`
- [x] `TimeFieldValueModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `TimeTrackingEntryModel` — reachable via `GetTimeTrackingEntries`
- [x] `TimeTrackingEntryTypeModel` — reachable via `GetTimeTrackingEntries`
- [x] `TimeTrackingModelList` — reachable via `GetTimeTrackingEntries`
- [ ] `TokenModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `TokenSensitiveDataModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `TokenType` — not reachable from currently MCP-covered request/response contracts
- [ ] `TokensModelList` — not reachable from currently MCP-covered request/response contracts
- [x] `TransitionModel` — reachable via `ListWorkflows`
- [x] `TreeNodeThumbModel` — reachable via `ListDocuments`
- [x] `TreeNodeType` — reachable via `ListDocuments`
- [x] `TypeColor` — reachable via `ListTypes`
- [x] `TypeIcon` — reachable via `ListTypes`
- [x] `TypeModel` — reachable via `ListTypes`
- [x] `TypeModelList` — reachable via `ListTypes`
- [x] `TypeThumbModel` — reachable via `ListAttributes`
- [x] `UniSelectFieldValueModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `UniStringFieldValueModel` — reachable via `GetDocumentWorkitemLinks`
- [ ] `UpdateAttributeValueRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateCommentPrincipalModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateCommentRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateCommentVisibilitySettingsRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateDateFieldRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateNumberFieldRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateQueryPrincipalModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateQueryVisibilitySettingsRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateTagFieldRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateTimeFieldRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateTokenRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateUniSelectFieldRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateUniStringFieldRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateUserFieldRequestBody` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateUserFieldValueModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `UpdateWorkitemTimeMetricSettingsRequestBody` — not reachable from currently MCP-covered request/response contracts
- [x] `UserFieldValueModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `UserModel` — reachable via `ListUsers`
- [x] `UserModelList` — reachable via `GetWorkspaceUsers`
- [x] `UserPrincipalModel` — reachable via `GetWorkitemCommentVisibilitySettings`
- [x] `UsersModelList` — reachable via `ListUsers`
- [ ] `WorkCalendarModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `WorkCalendarModelList` — not reachable from currently MCP-covered request/response contracts
- [x] `WorkflowModel` — reachable via `ListWorkflows`
- [x] `WorkflowModelList` — reachable via `ListWorkflows`
- [x] `WorkflowStatusModel` — reachable via `ListWorkflows`
- [x] `WorkflowThumbModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `WorkflowType` — reachable via `ListWorkflows`
- [x] `WorkitemLinkModel` — reachable via `ListWorkitemLinks`
- [x] `WorkitemModel` — reachable via `GetDocumentWorkitemLinks`
- [x] `WorkitemModelList` — reachable via `ListWorkitems`
- [x] `WorkitemPortfolioModel` — reachable via `GetDocumentWorkitemLinks`
- [ ] `WorkitemTimeMetricModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `WorkitemTimeMetricModelList` — not reachable from currently MCP-covered request/response contracts
- [ ] `WorkitemTimeMetricStatus` — not reachable from currently MCP-covered request/response contracts
- [ ] `WorkitemTimeMetricTemplateModel` — not reachable from currently MCP-covered request/response contracts
- [ ] `WorkitemTimeMetricTemplateModelList` — not reachable from currently MCP-covered request/response contracts
- [ ] `WorkitemTimeMetricTemplateType` — not reachable from currently MCP-covered request/response contracts
- [x] `WorkitemsCountModel` — reachable via `GetWorkitemsCount`
- [x] `WorkspaceModel` — reachable via `ListWorkspaces`
- [x] `WorkspaceModelList` — reachable via `ListWorkspaces`

## Unimplemented Inventory by Tag

Includes the 11 coming-soon operations. Full method/path identities and policy notes appear above.

| Tag | Total | MCP-covered | Not covered | Coming soon |
| --- | ---: | ---: | ---: | ---: |
| Agile | 4 | 3 | 1 | 0 |
| Attributes | 8 | 5 | 3 | 0 |
| DocumentAttachments | 9 | 2 | 7 | 0 |
| DocumentComments | 3 | 2 | 1 | 0 |
| DocumentLinks | 4 | 3 | 1 | 0 |
| DocumentVersions | 3 | 0 | 3 | 0 |
| Documents | 7 | 6 | 1 | 0 |
| DocumentsSharing | 4 | 3 | 1 | 0 |
| Folders | 5 | 4 | 1 | 0 |
| GitIntegrationTokens | 6 | 0 | 6 | 0 |
| OpenId | 4 | 0 | 4 | 0 |
| PortfolioElements | 7 | 6 | 1 | 0 |
| Portfolios | 5 | 4 | 1 | 0 |
| Providers | 1 | 0 | 1 | 0 |
| Queries | 3 | 0 | 3 | 0 |
| Roles | 5 | 0 | 5 | 0 |
| Sprints | 5 | 3 | 2 | 0 |
| Statuses | 3 | 2 | 1 | 0 |
| TimeTracking | 2 | 1 | 1 | 0 |
| Types | 7 | 1 | 6 | 0 |
| UserGroups | 2 | 0 | 2 | 0 |
| Users | 4 | 2 | 2 | 0 |
| WorkCalendars | 1 | 0 | 1 | 1 |
| Workflows | 5 | 1 | 4 | 0 |
| WorkitemAttachments | 9 | 6 | 3 | 0 |
| WorkitemAttributes | 2 | 1 | 1 | 0 |
| WorkitemComments | 6 | 3 | 3 | 0 |
| WorkitemLinks | 3 | 2 | 1 | 0 |
| WorkitemTimeMetricTemplates | 1 | 0 | 1 | 1 |
| WorkitemTimeMetrics | 9 | 0 | 9 | 9 |
| Workitems | 8 | 7 | 1 | 0 |
| WorkitemsSharing | 4 | 1 | 3 | 0 |
| WorkspaceGroups | 6 | 0 | 6 | 0 |
| WorkspaceUsers | 6 | 1 | 5 | 0 |
| Workspaces | 5 | 2 | 3 | 0 |

## Preserved Baseline Context

The old report records additions on 2026-07-02 (documents, folder writes), 2026-07-13 (attribute writes/options), 2026-07-15 (portfolios, pin/unpin and composite lookup), 2026-07-16 (embedded portfolio rendering and sprint enrichment), 2026-07-17 (links/status references, workspace/sprint/Agile tools and composite backlog), and 2026-07-20 (global users, task/document attachment downloads, attachment type corrections and workspace/global user schema attribution). Unchanged per-endpoint annotations are retained above; the single erroneous GetAttribute attribution is explicitly corrected.

- `ListWorkitemLinks` was previously checked against a live response and corrected to a bare array with full linked workitems. That historical observation is not a new live verification of API 4.2x.
- Task/document downloads stage bytes for `GET /download/:id`; uploads use `/upload` followed by the attachment tool. Both retain the documented server-token-only OOB authentication limitation. Download operations omit a documented success schema; coverage still counts actual MCP exposure.
- `teamstorm_time_entries_list` / `teamstorm_time_entries_create` use the private `/tasks/api/v1/workitems/{id}/time-tracking-entries` path. The separate `teamstorm_time_entries_list_by_period` covers public `GetTimeTrackingEntries`; `GetTimeTrackingEntriesUpdates` remains unexposed; the public spec has no entry POST or per-workitem filter.
- Composite name-based portfolio lookup calls `ListPortfolioElements` + `ListWorkitems`; backlog lookup filters `ListSprints`. Their tools add no unique public endpoints.
- No public `/me` or current-user operation exists; a PrivateToken cannot identify the caller by decoding it.
- Historical baseline recovered from `a650d7d:swagger.json` (2026-06-26): 159 operations / 179 schemas. Full structural comparison now distinguishes newly documented contract changes from pre-existing client mismatches; it is a June snapshot, not proof of the immediately preceding release or live enforcement. See [`docs/api-4.2x-change-report.md`](docs/api-4.2x-change-report.md) for all audit findings and dispositions.
