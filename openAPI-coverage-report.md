# TeamStorm OpenAPI → MCP Coverage Report

Generated: 2026-07-01 (updated: 2026-07-02 — added Documents, DocumentsSharing, DocumentsStatuses, DocumentLinks, DocumentComments tools; added Folders create/update tools; updated: 2026-07-13 — added Attributes create/patch tools: CreateAttribute, PatchAttribute, AddAttributeOption, PatchAttributeOption; updated: 2026-07-15 — added Portfolios and PortfolioElements tools, including workitem pin/unpin and name-based lookup; updated: 2026-07-16 — fixed `teamstorm_tasks_get` to render embedded `portfolios` (previously silently dropped) and enriched its `sprint` field with full details via a new internal `GetSprint` call; updated: 2026-07-17 — added CreateWorkitemLink (`teamstorm_task_links_create`, with name-or-id link-type resolution), ListLinkTypes (`teamstorm_link_types_list`), ListStatusCategories (`teamstorm_status_categories_list`), ListStatuses/GetStatus (`teamstorm_workspace_statuses_list`/`teamstorm_workspace_statuses_get`); also fixed a pre-existing response-shape bug in `teamstorm_task_links_list` (ListWorkitemLinks returns a bare array with the full embedded linked workitem, not `{items: [...]}` with thin source/target — found by diffing a live API response against the client's assumed type); updated: 2026-07-17 (later same day) — added GetWorkspace (`teamstorm_workspaces_get`), GetSprint as a standalone tool (`teamstorm_sprints_get`, with client-computed team capacity), CreateSprint (`teamstorm_sprints_create`, resolves folderId→agileId), and the full Agile tag except delete: GetAgileExtensions/GetAgile/CreateAgile (`teamstorm_agile_boards_list`/`teamstorm_agile_boards_get`/`teamstorm_agile_boards_create`); added a composite `teamstorm_sprints_get_backlog` (filters ListSprints by folder for `isBacklog: true`, no dedicated REST resource exists for it); updated: 2026-07-20 — added global GetUser/ListUsers (`teamstorm_users_get`/`teamstorm_users_list_all`, distinct from the existing workspace-scoped `teamstorm_users_list`), DownloadWorkitemAttachments (`teamstorm_attachments_download`, new out-of-band download infrastructure: `GET /download/:id`, `src/utils/download-store.ts`, TTL cleanup, separate rate limiter — mirrors the existing OOB upload flow), and a new `document-attachments/` domain covering GetDocumentAttachments/DownloadDocumentAttachments (`teamstorm_document_attachments_list`/`teamstorm_document_attachments_download`, reusing the same download infrastructure); `get_current_user` evaluated and intentionally not implemented — no backing endpoint exists anywhere in the spec; extended `TeamStormAttachment` with `version`/`antivirusVerdict` (both required in `AttachmentModel` but previously missing) and fixed `TeamStormAttachmentListResponse` to drop phantom pagination fields not present in `AttachmentModelList`; also corrected a pre-existing mixup where `teamstorm_users_list`'s actual response schema (`UserModelList`) and the global `ListUsers` schema (`UsersModelList`) were swapped in this report)

## Summary

- Total endpoints: 159
- Implemented: 75 (47%)
- Not implemented: 84 (53%)
- Total schemas: 179
- Schemas used: 75
- Schemas not used: 104

---

## Endpoints by Tag

### Agile

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — operationId: GetAgile — MCP tool: `teamstorm_agile_boards_get`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — operationId: DeleteAgile — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/agile/list` — operationId: GetAgileExtensions — MCP tool: `teamstorm_agile_boards_list` (also used internally by `teamstorm_sprints_create`'s folder→agile resolver)
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/agile` — operationId: CreateAgile — MCP tool: `teamstorm_agile_boards_create` (note: request body has no `name` field — server derives it)

### Attributes

- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/attributes` — operationId: CreateAttribute — MCP tool: `teamstorm_attributes_create`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/attributes` — operationId: ListAttributes — MCP tool: `teamstorm_attributes_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: GetAttribute — MCP tool: `teamstorm_attributes_get` (via task attributes endpoint; note: this specific attribute-by-id endpoint is not directly called, but the task attributes GET is covered under WorkitemAttributes)
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: PatchAttribute — MCP tool: `teamstorm_attributes_update`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: DeleteAttribute — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options` — operationId: AddAttributeOption — MCP tool: `teamstorm_attributes_add_option`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options` — operationId: PatchAttributeOption — MCP tool: `teamstorm_attributes_update_option`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options/{optionId}` — operationId: DeleteAttributeOption — NOT IMPLEMENTED (intentionally: no delete tools)

### DocumentAttachments

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}` — operationId: GetDocumentAttachment — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}` — operationId: DeleteDocumentAttachment — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments` — operationId: GetDocumentAttachments — MCP tool: `teamstorm_document_attachments_list`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments` — operationId: DeleteDocumentAttachments — NOT IMPLEMENTED (intentionally: no delete tools)
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: GetDocumentAttachmentWithVersions — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: DeleteDocumentAttachmentVersion — NOT IMPLEMENTED (intentionally: no delete tools)
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/versions` — operationId: GetDocumentAttachmentsWithVersions — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/upload` — operationId: UploadDocumentAttachments — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/download` — operationId: DownloadDocumentAttachments — MCP tool: `teamstorm_document_attachments_download` (same out-of-band download infra as `teamstorm_attachments_download`)

### DocumentComments

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments` — operationId: ListDocumentComments — MCP tool: `teamstorm_document_comments_list`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments` — operationId: CreateDocumentComment — MCP tool: `teamstorm_document_comments_create`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments/{commentId}` — operationId: DeleteDocumentComment — NOT IMPLEMENTED

### DocumentLinks

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: GetDocumentWorkitemLinks — MCP tool: `teamstorm_document_links_list_by_document`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: CreateDocumentWorkitemLink — MCP tool: `teamstorm_document_links_create`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: DeleteDocumentWorkitemLink — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/document-links` — operationId: GetWorkitemDocumentLinks — MCP tool: `teamstorm_document_links_list_by_task`

### Documents

- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents` — operationId: CreateDocument — MCP tool: `teamstorm_documents_create`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents` — operationId: ListDocuments — MCP tool: `teamstorm_documents_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: GetDocument — MCP tool: `teamstorm_documents_get`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: DeleteDocument — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: PatchDocument — MCP tool: `teamstorm_documents_update`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/block` — operationId: BlockDocument — MCP tool: `teamstorm_documents_block`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/unblock` — operationId: UnblockDocument — MCP tool: `teamstorm_documents_unblock`

### DocumentsSharing

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing` — operationId: ListSharedDocumentPermissions — MCP tool: `teamstorm_document_permissions_list`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing` — operationId: CreateSharedDocumentPermission — MCP tool: `teamstorm_document_permissions_create`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing/{permissionId}` — operationId: PatchSharedDocumentPermission — MCP tool: `teamstorm_document_permissions_update`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing/{permissionId}` — operationId: DeleteSharedDocumentPermission — NOT IMPLEMENTED

### DocumentsStatuses

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents-statuses` — operationId: ListDocumentStatuses — MCP tool: `teamstorm_document_statuses_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents-statuses/{status}` — operationId: GetDocumentsStatus — MCP tool: `teamstorm_document_statuses_get`

### DocumentVersions

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions` — operationId: ListDocumentVersions — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions/{documentVersion}` — operationId: GetDocumentByVersion — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions/{documentVersion}` — operationId: DeleteDocumentVersion — NOT IMPLEMENTED

### Folders

- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/folders` — operationId: CreateFolder — MCP tool: `teamstorm_folders_create`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/folders` — operationId: ListFolders — MCP tool: `teamstorm_folders_list`, `teamstorm_folders_tree`, `teamstorm_folders_find`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: GetFolder — MCP tool: `teamstorm_folders_get`, `teamstorm_folders_find`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: PatchFolder — MCP tool: `teamstorm_folders_update`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: DeleteFolder — NOT IMPLEMENTED (intentionally: no delete tools)

### GitIntegrationTokens

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens` — operationId: ListTokens — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens` — operationId: CreateToken — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: GetToken — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: UpdateToken — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: DeleteTokenAsync — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}/refresh` — operationId: RefreshToken — NOT IMPLEMENTED

### LinkTypes

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/link-types` — operationId: ListLinkTypes — MCP tool: `teamstorm_link_types_list`

### OpenId

- [ ] `GET /cwm/public/api/v1/open-id/connections` — operationId: GetConnections — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/open-id/connections` — operationId: CreateConnection — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/open-id/connections/{connectionId}` — operationId: DeleteConnection — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/open-id/connections/{connectionId}/users` — operationId: CreateUser — NOT IMPLEMENTED

### PortfolioElements

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements` — operationId: ListPortfolioElements — MCP tool: `teamstorm_portfolio_elements_list`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements` — operationId: (no operationId) — MCP tool: `teamstorm_portfolio_elements_create`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: GetPortfolioElement — MCP tool: `teamstorm_portfolio_elements_get`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: (no operationId) — MCP tool: `teamstorm_portfolio_elements_update`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: (no operationId) — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}/workitems/{workitem}` — operationId: (no operationId) — MCP tool: `teamstorm_portfolio_links_set` (accepts portfolioElementId or portfolioElementName)
- [x] `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}/workitems/{workitem}` — operationId: (no operationId) — MCP tool: `teamstorm_portfolio_links_remove` (accepts portfolioElementId or portfolioElementName)

### Portfolios

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolios` — operationId: ListPortfolios — MCP tool: `teamstorm_portfolios_list`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolios` — operationId: (no operationId) — MCP tool: `teamstorm_portfolios_create`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` — operationId: GetPortfolio — MCP tool: `teamstorm_portfolios_get`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` — operationId: (no operationId) — MCP tool: `teamstorm_portfolios_update`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` — operationId: (no operationId) — NOT IMPLEMENTED (intentionally: no delete tools)

### Providers

- [ ] `GET /cwm/public/api/v1/providers` — operationId: GetProviders — NOT IMPLEMENTED

### Queries

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/queries/{queryId}/visibility` — operationId: GetQueryVisibilitySettings — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/queries/{queryId}/visibility` — operationId: UpdateQueryVisibilitySettings — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/queries/{queryId}/workitems` — operationId: ListQueryWorkitems — NOT IMPLEMENTED

### Roles

- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/roles` — operationId: CreateRole — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/roles` — operationId: ListRoles — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/roles/{roleId}` — operationId: GetRole — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/roles/{roleId}` — operationId: PatchRole — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/roles/{roleId}` — operationId: DeleteRole — NOT IMPLEMENTED

### Sprints

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/sprints` — operationId: ListSprints — MCP tool: `teamstorm_sprints_list` (also used by `teamstorm_sprints_get_backlog`, filtering `folderId` results for `isBacklog: true`)
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/sprints` — operationId: CreateSprint — MCP tool: `teamstorm_sprints_create` (resolves `folderId`→`agileId` via `GetAgileExtensions`)
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: GetSprint — used internally by `teamstorm_tasks_get` (`client.getSprint`) to enrich the task's embedded sprint thumb; also now a standalone tool, `teamstorm_sprints_get` (adds a client-computed team capacity figure — not an API field)
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: PatchSprint — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: DeleteSprint — NOT IMPLEMENTED (intentionally: no delete tools)

### StatusCategories

- [x] `GET /cwm/public/api/v1/status-categories` — operationId: ListStatusCategories — MCP tool: `teamstorm_status_categories_list` (global endpoint, no `{workspace}` in path)

### Statuses

- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/statuses` — operationId: CreateStatus — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/statuses` — operationId: ListStatuses — MCP tool: `teamstorm_workspace_statuses_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/statuses/{status}` — operationId: GetStatus — MCP tool: `teamstorm_workspace_statuses_get`

### TimeTracking

- [ ] `GET /cwm/public/api/v1/workspaces/time-tracking-entries` — operationId: GetTimeTrackingEntries — NOT IMPLEMENTED (MCP uses internal `/tasks/api/v1/` endpoint instead)
- [ ] `GET /cwm/public/api/v1/workspaces/time-tracking-entries/updates` — operationId: GetTimeTrackingEntriesUpdates — NOT IMPLEMENTED

### Types

- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/types` — operationId: CreateType — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/types` — operationId: ListTypes — MCP tool: `teamstorm_task_types_list`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: GetType — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: PatchType — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: DeleteType — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/types/{type}/attributes/{attributeId}` — operationId: AddTypeAttribute — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/types/{type}/attributes/{attributeId}` — operationId: DeleteTypeAttribute — NOT IMPLEMENTED

### UserGroups

- [ ] `GET /cwm/public/api/v1/user-groups` — operationId: ListUserGroups — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/user-groups/{group}` — operationId: GetUserGroup — NOT IMPLEMENTED

### Users

- [x] `GET /cwm/public/api/v1/users` — operationId: ListUsers — MCP tool: `teamstorm_users_list_all` (global, server-side filtered by displayName/email/username/providerId — distinct from workspace-scoped `teamstorm_users_list`)
- [x] `GET /cwm/public/api/v1/users/{user}` — operationId: GetUser — MCP tool: `teamstorm_users_get` (global, no workspace in path)
- [ ] `POST /cwm/public/api/v1/users/block/{userId}` — operationId: BlockUser — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/users/unblock/{userId}` — operationId: UnblockUser — NOT IMPLEMENTED

### Workflows

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workflows` — operationId: ListWorkflows — MCP tool: `teamstorm_workflows_list`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workflows` — operationId: CreateWorkflow — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: GetWorkflow — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: PatchWorkflow — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: DeleteWorkflow — NOT IMPLEMENTED

### WorkitemAttachments

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}` — operationId: GetWorkitemAttachment — MCP tool: `teamstorm_attachments_get`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}` — operationId: DeleteWorkitemAttachment — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments` — operationId: GetWorkitemAttachments — MCP tool: `teamstorm_attachments_list`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments` — operationId: DeleteWorkitemAttachments — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: GetWorkitemAttachmentWithVersions — MCP tool: `teamstorm_attachments_get_version`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: DeleteWorkitemAttachmentVersion — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/versions` — operationId: GetWorkitemAttachmentsWithVersions — MCP tool: `teamstorm_attachments_list_versions`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/upload` — operationId: UploadWorkitemAttachments — MCP tool: `teamstorm_attachments_attach_uploaded`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/download` — operationId: DownloadWorkitemAttachments — MCP tool: `teamstorm_attachments_download` (out-of-band: saves to disk, returns a `GET /download/:id` URL — see AGENTS.md "Загрузка и скачивание файлов")

### WorkitemAttributes

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attributes` — operationId: ListWorkitemAttributes — MCP tool: `teamstorm_attributes_get`
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attributes/{attributeId}` — operationId: UpdateWorkitemAttribute — NOT IMPLEMENTED

### WorkitemComments

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments` — operationId: ListWorkitemComments — MCP tool: `teamstorm_comments_list`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments` — operationId: CreateWorkitemComment — MCP tool: `teamstorm_comments_create`
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — operationId: UpdateWorkitemComment — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — operationId: DeleteWorkitemComment — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}/visibility` — operationId: GetWorkitemCommentVisibilitySettings — MCP tool: `teamstorm_comments_get_visibility`
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}/visibility` — operationId: UpdateWorkitemCommentVisibilitySettings — NOT IMPLEMENTED

### WorkitemLinks

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/links` — operationId: ListWorkitemLinks — MCP tool: `teamstorm_task_links_list` (fixed 2026-07-17: response is a bare `WorkitemLinkModel[]` embedding the full linked workitem, not the previously-assumed `{items: [{id, linkType, source, target}]}` shape — verified against a live workspace)
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/links` — operationId: CreateWorkitemLink — MCP tool: `teamstorm_task_links_create` (accepts link type by id or by name/key, resolved via `teamstorm_link_types_list`)
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/links/{linkId}` — operationId: DeleteWorkitemLink — NOT IMPLEMENTED (intentionally: no delete tools)

### Workitems

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems` — operationId: ListWorkitems — MCP tool: `teamstorm_tasks_list`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems` — operationId: CreateWorkitem — MCP tool: `teamstorm_tasks_create`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/by-parent/{parent}` — operationId: ListWorkitemsByParent — MCP tool: `teamstorm_tasks_list_by_parent`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: GetWorkitemById — MCP tool: `teamstorm_tasks_get`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: DeleteWorkitem — NOT IMPLEMENTED
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: PatchWorkitem — MCP tool: `teamstorm_tasks_update`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/count` — operationId: GetWorkitemsCount — MCP tool: `teamstorm_tasks_count`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/updates` — operationId: ListWorkitemsUpdates — MCP tool: `teamstorm_tasks_list_updated`

### WorkitemsSharing

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing` — operationId: ListSharedWorkitemPermissions — MCP tool: `teamstorm_task_permissions_get`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing` — operationId: CreateSharedWorkitemPermission — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing/{permissionId}` — operationId: PatchSharedWorkitemPermission — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing/{permissionId}` — operationId: DeleteSharedWorkitemPermission — NOT IMPLEMENTED

### WorkspaceGroups

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/groups` — operationId: FilterWorkspaceUsers — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}` — operationId: AddWorkspaceGroup — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}` — operationId: RemoveWorkspaceGroup — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}/roles/{roleId}` — operationId: AddGroupRole — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}/roles/{roleId}` — operationId: RemoveRoleForGroup — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/groups/{groupId}/roles` — operationId: GetGroupRoles — NOT IMPLEMENTED

### WorkspaceUsers

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/users` — operationId: GetWorkspaceUsers — MCP tool: `teamstorm_users_list` (response schema is actually `UserModelList`, not `UsersModelList` — corrected 2026-07-20, found while cross-checking schemas for the new global user tools)
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/users/{userId}` — operationId: AddWorkspaceUser — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/users/{userId}` — operationId: RemoveWorkspaceUser — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles/{roleId}` — operationId: AddUserRole — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles/{roleId}` — operationId: RemoveRoleForUser — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles` — operationId: GetUserRoles — NOT IMPLEMENTED

### Workspaces

- [ ] `POST /cwm/public/api/v1/workspaces` — operationId: CreateWorkspace — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces` — operationId: ListWorkspaces — MCP tool: `teamstorm_workspaces_list`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}` — operationId: GetWorkspace — MCP tool: `teamstorm_workspaces_get` (unverified live — may share the bare-list-endpoint author-record flakiness noted below)
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}` — operationId: PatchWorkspace — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}` — operationId: DeleteWorkspace — NOT IMPLEMENTED (intentionally: no delete tools)

---

## Note on Time Tracking Endpoints

The MCP tools `teamstorm_time_entries_create` and `teamstorm_time_entries_list` use an **internal API** path (`/tasks/api/v1/workitems/{id}/time-tracking-entries`) that is **NOT** part of the public OpenAPI spec (`swagger.json.1`). They do not map to the public `GetTimeTrackingEntries` or `GetTimeTrackingEntriesUpdates` endpoints.

---

## Schema / Data Types Coverage

- [x] `AgileModel` — used in MCP tools: `teamstorm_agile_boards_list`, `teamstorm_agile_boards_get`, `teamstorm_agile_boards_create`
- [x] `AntivirusScanVerdict` — used in MCP tools: all attachment tools that return `TeamStormAttachment` (field added 2026-07-20 — was previously missing from the type despite being required in `AttachmentModel`)
- [x] `AttachmentModel` — used in MCP tools: `teamstorm_attachments_get`, `teamstorm_attachments_attach_uploaded`, `teamstorm_document_attachments_list`
- [x] `AttachmentModelList` — used in MCP tools: `teamstorm_attachments_list`, `teamstorm_attachments_attach_uploaded`, `teamstorm_document_attachments_list`
- [x] `AttributeModel` — used in MCP tools: `teamstorm_attributes_create`, `teamstorm_attributes_update`, `teamstorm_attributes_add_option`, `teamstorm_attributes_update_option`
- [x] `AttributeOptionModel` — used in MCP tools: `teamstorm_attributes_create`, `teamstorm_attributes_update`, `teamstorm_attributes_add_option`, `teamstorm_attributes_update_option` (options in AttributeModel response)
- [x] `AttributeType` — used in MCP tool: `teamstorm_attributes_create`
- [x] `AttributeValueModel` — used in MCP tool: `teamstorm_attributes_get`, `teamstorm_attributes_list`
- [x] `AttributeValueModelList` — used in MCP tool: `teamstorm_attributes_get`, `teamstorm_attributes_list`
- [x] `AttributesModelList` — used in MCP tool: `teamstorm_attributes_list`
- [x] `CommentModel` — used in MCP tools: `teamstorm_comments_list`, `teamstorm_comments_create`
- [x] `CommentModelList` — used in MCP tool: `teamstorm_comments_list`
- [x] `CommentVisibilitySettingsModel` — used in MCP tool: `teamstorm_comments_get_visibility`
- [ ] `CommentVisibilityType` — NOT USED in any MCP tool
- [x] `CreateAgileRequestBody` — used in MCP tool: `teamstorm_agile_boards_create`
- [x] `CreateAttributeOptionModel` — used in MCP tool: `teamstorm_attributes_create` (options array)
- [x] `CreateAttributeOptionRequestBody` — used in MCP tool: `teamstorm_attributes_add_option`
- [x] `CreateAttributeRequestBody` — used in MCP tool: `teamstorm_attributes_create`
- [ ] `CreateAttributeValueRequestBody` — NOT USED in any MCP tool
- [x] `CreateCommentRequestBody` — used in MCP tool: `teamstorm_comments_create`
- [ ] `CreateDateFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateDocumentRequestBody` — NOT USED in any MCP tool
- [ ] `CreateDocumentWorkitemLinkRequestBody` — NOT USED in any MCP tool
- [x] `CreateFolderRequestBody` — used in MCP tool: `teamstorm_folders_create`
- [ ] `CreateNumberFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateOpenIdConnectionModel` — NOT USED in any MCP tool
- [ ] `CreateOpenIdUserModel` — NOT USED in any MCP tool
- [x] `CreatePortfolioElementRequestBody` — used in MCP tool: `teamstorm_portfolio_elements_create`
- [x] `CreatePortfolioRequestBody` — used in MCP tool: `teamstorm_portfolios_create`
- [ ] `CreateRoleRequestBody` — NOT USED in any MCP tool
- [ ] `CreateSharedDocumentGroupPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedDocumentPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedDocumentUserPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedWorkitemGroupPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedWorkitemPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedWorkitemUserPermissionBody` — NOT USED in any MCP tool
- [x] `CreateSprintRequestBody` — used in MCP tool: `teamstorm_sprints_create`
- [ ] `CreateStatusRequestBody` — NOT USED in any MCP tool
- [ ] `CreateTagFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateTimeFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateTokenRequestBody` — NOT USED in any MCP tool
- [ ] `CreateTransitionRequestBody` — NOT USED in any MCP tool
- [ ] `CreateTypeRequestBody` — NOT USED in any MCP tool
- [ ] `CreateUniSelectFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateUniStringFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateUserFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateUserFieldValueModel` — NOT USED in any MCP tool
- [ ] `CreateWorkflowRequestBody` — NOT USED in any MCP tool
- [ ] `CreateWorkflowStatusRequestBody` — NOT USED in any MCP tool
- [x] `CreateWorkitemLinkRequestBody` — used in MCP tool: `teamstorm_task_links_create`
- [x] `CreateWorkitemRequestBody` — used in MCP tool: `teamstorm_tasks_create`
- [ ] `CreateWorkspaceRequestBody` — NOT USED in any MCP tool
- [ ] `DateFieldValueModel` — NOT USED in any MCP tool
- [ ] `DeleteDocumentWorkitemLinkRequestBody` — NOT USED in any MCP tool
- [ ] `DocumentModel` — NOT USED in any MCP tool
- [ ] `DocumentStatusModel` — NOT USED in any MCP tool
- [ ] `DocumentVersionModel` — NOT USED in any MCP tool
- [ ] `DocumentVersionsModelList` — NOT USED in any MCP tool
- [ ] `DocumentsModelList` — NOT USED in any MCP tool
- [ ] `DocumentsStatusModelList` — NOT USED in any MCP tool
- [x] `ErrorModel` — used in all MCP tools (error handling)
- [x] `EstimatesType` — used in MCP tools: `teamstorm_agile_boards_create`, `teamstorm_agile_boards_list`, `teamstorm_agile_boards_get`
- [x] `FolderModel` — used in MCP tools: `teamstorm_folders_get`, `teamstorm_folders_list`, `teamstorm_folders_find`, `teamstorm_folders_tree`
- [x] `FolderModelList` — used in MCP tools: `teamstorm_folders_list`, `teamstorm_folders_tree`, `teamstorm_folders_find`
- [x] `FolderThumbModel` — used in MCP tool: `teamstorm_portfolios_get` (embedded `folder` field on `PortfolioModel`)
- [ ] `GroupModel` — NOT USED in any MCP tool
- [ ] `GroupModelList` — NOT USED in any MCP tool
- [ ] `GroupPrincipalModel` — NOT USED in any MCP tool
- [x] `LinkTypeModel` — used in MCP tools: `teamstorm_task_links_list`, `teamstorm_task_links_create`, `teamstorm_link_types_list`
- [x] `LinkTypeModelList` — used in MCP tool: `teamstorm_link_types_list`
- [ ] `NumberFieldValueModel` — NOT USED in any MCP tool
- [ ] `OpenIdConnectionModel` — NOT USED in any MCP tool
- [ ] `OptionModel` — NOT USED in any MCP tool
- [x] `PatchAttributeOptionModel` — used in MCP tool: `teamstorm_attributes_update` (options array)
- [x] `PatchAttributeOptionRequestBody` — used in MCP tool: `teamstorm_attributes_update_option`
- [x] `PatchAttributeRequestBody` — used in MCP tool: `teamstorm_attributes_update`
- [ ] `PatchDocumentRequestBody` — NOT USED in any MCP tool
- [x] `PatchFolderRequestBody` — used in MCP tool: `teamstorm_folders_update`
- [x] `PatchPortfolioElementRequestBody` — used in MCP tool: `teamstorm_portfolio_elements_update`
- [x] `PatchPortfolioRequestBody` — used in MCP tool: `teamstorm_portfolios_update`
- [ ] `PatchRoleRequestBody` — NOT USED in any MCP tool
- [ ] `PatchSharedDocumentPermissionBody` — NOT USED in any MCP tool
- [ ] `PatchSharedWorkitemPermissionBody` — NOT USED in any MCP tool
- [ ] `PatchSprintRequestBody` — NOT USED in any MCP tool
- [ ] `PatchTransitionRequestBody` — NOT USED in any MCP tool
- [ ] `PatchTypeRequestBody` — NOT USED in any MCP tool
- [ ] `PatchWorkflowRequestBody` — NOT USED in any MCP tool
- [ ] `PatchWorkflowStatusRequestBody` — NOT USED in any MCP tool
- [x] `PatchWorkitemRequestBody` — used in MCP tool: `teamstorm_tasks_update`
- [ ] `PatchWorkspaceRequestBody` — NOT USED in any MCP tool
- [ ] `Permission` — NOT USED in any MCP tool
- [x] `PortfolioElementModel` — used in MCP tools: `teamstorm_portfolio_elements_get`, `teamstorm_portfolio_elements_create`, `teamstorm_portfolio_elements_update`, `teamstorm_portfolio_links_set`
- [x] `PortfolioElementModelList` — used in MCP tools: `teamstorm_portfolio_elements_list`, `teamstorm_portfolio_links_list_tasks_by_name`
- [x] `PortfolioElementThumbModel` — used in MCP tool: `teamstorm_portfolios_get` (embedded `elements` field on `PortfolioModel`)
- [x] `PortfolioModel` — used in MCP tools: `teamstorm_portfolios_get`, `teamstorm_portfolios_create`, `teamstorm_portfolios_update`
- [x] `PortfolioModelList` — used in MCP tool: `teamstorm_portfolios_list`
- [x] `PortfolioThumbModel` — used in MCP tool: `teamstorm_portfolio_elements_get` (embedded `portfolio` field on `PortfolioElementModel`)
- [ ] `PrincipalModel` — NOT USED in any MCP tool
- [ ] `PrincipalType` — NOT USED in any MCP tool
- [ ] `ProgressType` — NOT USED in any MCP tool
- [ ] `ProviderModel` — NOT USED in any MCP tool
- [ ] `ProviderModelList` — NOT USED in any MCP tool
- [ ] `ProviderType` — NOT USED in any MCP tool
- [ ] `QueryVisibilitySettingsModel` — NOT USED in any MCP tool
- [ ] `QueryVisibilityType` — NOT USED in any MCP tool
- [ ] `RoleModel` — NOT USED in any MCP tool
- [ ] `RolesModelList` — NOT USED in any MCP tool
- [ ] `SharedDocumentGroupPermissionModel` — NOT USED in any MCP tool
- [ ] `SharedDocumentPermissionModel` — NOT USED in any MCP tool
- [ ] `SharedDocumentUserPermissionModel` — NOT USED in any MCP tool
- [ ] `SharedItemAccessLevel` — NOT USED in any MCP tool
- [ ] `SharedItemAccessType` — NOT USED in any MCP tool
- [x] `SharedWorkitemGroupPermissionModel` — used in MCP tool: `teamstorm_task_permissions_get`
- [x] `SharedWorkitemPermissionModel` — used in MCP tool: `teamstorm_task_permissions_get`
- [x] `SharedWorkitemUserPermissionModel` — used in MCP tool: `teamstorm_task_permissions_get`
- [ ] `SimpleRoleModel` — NOT USED in any MCP tool
- [ ] `SimpleRoleModelList` — NOT USED in any MCP tool
- [x] `SprintMemberRequestBody` — used in MCP tool: `teamstorm_sprints_create` (`team` array)
- [x] `SprintModel` — used in MCP tool: `teamstorm_sprints_list`
- [x] `SprintModelList` — used in MCP tool: `teamstorm_sprints_list`
- [x] `SprintStates` — used in MCP tools: `teamstorm_sprints_get`, `teamstorm_sprints_get_backlog` (`state` field)
- [x] `SprintThumbModel` — used in MCP tool: `teamstorm_tasks_get` (embedded `sprint` field on `WorkitemModel`, before being enriched via `GetSprint`)
- [x] `StatusCategoryModel` — used in MCP tools: `teamstorm_status_categories_list`, `teamstorm_workspace_statuses_list`, `teamstorm_workspace_statuses_get` (embedded in `category`)
- [x] `StatusCategoryModelList` — used in MCP tool: `teamstorm_status_categories_list`
- [x] `StatusModel` — used in MCP tools: `teamstorm_workspace_statuses_list`, `teamstorm_workspace_statuses_get`
- [x] `StatusModelList` — used in MCP tool: `teamstorm_workspace_statuses_list`
- [ ] `SystemRoles` — NOT USED in any MCP tool
- [ ] `TagFieldValueModel` — NOT USED in any MCP tool
- [x] `TeamMemberModel` — used in MCP tools: `teamstorm_sprints_get`, `teamstorm_sprints_get_backlog` (`team` field, source for the computed capacity figure)
- [ ] `TimeFieldValueModel` — NOT USED in any MCP tool
- [ ] `TimeTrackingEntryModel` — NOT USED in any MCP tool (time tracking uses internal non-public API)
- [ ] `TimeTrackingEntryTypeModel` — NOT USED in any MCP tool
- [ ] `TimeTrackingModelList` — NOT USED in any MCP tool
- [ ] `TokenModel` — NOT USED in any MCP tool
- [ ] `TokenSensitiveDataModel` — NOT USED in any MCP tool
- [ ] `TokenType` — NOT USED in any MCP tool
- [ ] `TokensModelList` — NOT USED in any MCP tool
- [ ] `TransitionModel` — NOT USED in any MCP tool
- [ ] `TreeNodeThumbModel` — NOT USED in any MCP tool
- [ ] `TreeNodeType` — NOT USED in any MCP tool
- [ ] `TypeColor` — NOT USED in any MCP tool
- [ ] `TypeIcon` — NOT USED in any MCP tool
- [x] `TypeModel` — used in MCP tool: `teamstorm_task_types_list`
- [x] `TypeModelList` — used in MCP tool: `teamstorm_task_types_list`
- [ ] `TypeThumbModel` — NOT USED in any MCP tool
- [ ] `UniSelectFieldValueModel` — NOT USED in any MCP tool
- [ ] `UniStringFieldValueModel` — NOT USED in any MCP tool
- [ ] `UpdateAttributeValueRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateCommentPrincipalModel` — NOT USED in any MCP tool
- [ ] `UpdateCommentRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateCommentVisibilitySettingsRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateDateFieldRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateNumberFieldRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateQueryPrincipalModel` — NOT USED in any MCP tool
- [ ] `UpdateQueryVisibilitySettingsRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateTagFieldRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateTimeFieldRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateTokenRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateUniSelectFieldRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateUniStringFieldRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateUserFieldRequestBody` — NOT USED in any MCP tool
- [ ] `UpdateUserFieldValueModel` — NOT USED in any MCP tool
- [x] `UserFieldValueModel` — NOT USED directly, but user fields appear in WorkitemModel
- [x] `UserModel` — used in MCP tools: `teamstorm_users_list`, `teamstorm_users_get`, `teamstorm_users_list_all`
- [x] `UserModelList` — used in MCP tool: `teamstorm_users_list` (workspace-scoped `GetWorkspaceUsers` — corrected 2026-07-20; previously misattributed to `UsersModelList` below)
- [x] `UserPrincipalModel` — used in MCP tool: `teamstorm_task_permissions_get`
- [x] `UsersModelList` — used in MCP tool: `teamstorm_users_list_all` (global `ListUsers`, no pagination fields — corrected 2026-07-20)
- [x] `WorkflowModel` — used in MCP tool: `teamstorm_workflows_list`
- [x] `WorkflowModelList` — used in MCP tool: `teamstorm_workflows_list`
- [ ] `WorkflowStatusModel` — NOT USED in any MCP tool
- [x] `WorkflowThumbModel` — used in MCP tool: `teamstorm_portfolios_get` (embedded optional `workflow` field on `PortfolioModel`)
- [ ] `WorkflowType` — NOT USED in any MCP tool
- [x] `WorkitemLinkModel` — used in MCP tools: `teamstorm_task_links_list`, `teamstorm_task_links_create`
- [x] `WorkitemModel` — used in MCP tools: `teamstorm_tasks_list`, `teamstorm_tasks_get`, `teamstorm_tasks_create`, `teamstorm_tasks_update`, `teamstorm_tasks_list_by_parent`, `teamstorm_tasks_list_updated`
- [x] `WorkitemModelList` — used in MCP tools: `teamstorm_tasks_list`
- [x] `WorkitemPortfolioModel` — used in MCP tool: `teamstorm_tasks_get` (embedded `portfolios` field on `WorkitemModel`)
- [x] `WorkitemsCountModel` — used in MCP tool: `teamstorm_tasks_count`
- [x] `WorkspaceModel` — used in MCP tools: `teamstorm_workspaces_list`, `teamstorm_workspaces_get`
- [x] `WorkspaceModelList` — used in MCP tool: `teamstorm_workspaces_list`

---

## Not Implemented Endpoints (Summary List)

### Agile (1 endpoint remaining, 3 implemented)
Implemented as of 2026-07-17 (later same day): GetAgile/GetAgileExtensions/CreateAgile (`teamstorm_agile_boards_get`/`teamstorm_agile_boards_list`/`teamstorm_agile_boards_create`). Still not implemented:
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — DeleteAgile (intentionally excluded: no delete tools)

### Attributes (2 endpoints remaining — DELETE only, intentionally excluded)
Implemented as of 2026-07-13: CreateAttribute (`teamstorm_attributes_create`), PatchAttribute (`teamstorm_attributes_update`), AddAttributeOption (`teamstorm_attributes_add_option`), PatchAttributeOption (`teamstorm_attributes_update_option`). Still not implemented:
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — DeleteAttribute (intentionally excluded: no delete tools)
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options/{optionId}` — DeleteAttributeOption (intentionally excluded: no delete tools)

### Documents (remaining gaps)
Implemented as of 2026-07-02: all Documents, DocumentsSharing, DocumentsStatuses, DocumentLinks, DocumentComments endpoints except DELETE (intentionally excluded). Implemented as of 2026-07-20: GetDocumentAttachments/DownloadDocumentAttachments (`teamstorm_document_attachments_list`/`teamstorm_document_attachments_download`). Still not implemented:
- All DELETE endpoints: DeleteDocument, DeleteSharedDocumentPermission, DeleteDocumentWorkitemLink, DeleteDocumentComment
- Remaining DocumentAttachments endpoints (7 of 9): single-item GetDocumentAttachment, versions (GetDocumentAttachmentWithVersions/GetDocumentAttachmentsWithVersions), UploadDocumentAttachments, and the 3 DELETE endpoints
- All DocumentVersions endpoints (3)

### Folders (1 endpoint)
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — DeleteFolder (intentionally excluded: no delete tools)

### GitIntegrationTokens (6 endpoints — entire tag)
- All 6 token management endpoints

### OpenId (4 endpoints — entire tag)
- All 4 OpenID connection management endpoints

### Portfolios + PortfolioElements (2 endpoints remaining — DELETE only, intentionally excluded)
Implemented as of 2026-07-15: ListPortfolios/GetPortfolio/CreatePortfolio/PatchPortfolio (`teamstorm_portfolios_list`, `teamstorm_portfolios_get`, `teamstorm_portfolios_create`, `teamstorm_portfolios_update`); ListPortfolioElements/GetPortfolioElement/CreatePortfolioElement/PatchPortfolioElement (`teamstorm_portfolio_elements_list`, `teamstorm_portfolio_elements_get`, `teamstorm_portfolio_elements_create`, `teamstorm_portfolio_elements_update`); the workitem pin/unpin sub-resource endpoints (`teamstorm_portfolio_links_set`, `teamstorm_portfolio_links_remove`); plus a combined name-based lookup tool (`teamstorm_portfolio_links_list_tasks_by_name`, not a 1:1 endpoint mapping — composes ListPortfolioElements + ListWorkitems). Still not implemented:
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` (intentionally excluded: no delete tools)
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` (intentionally excluded: no delete tools)

### Providers (1 endpoint)
- `GET /cwm/public/api/v1/providers` — GetProviders

### Queries (3 endpoints — entire tag)
- All query visibility and workitem query endpoints

### Roles (5 endpoints — entire tag)
- All role management endpoints

### Sprints (2 endpoints remaining, 3 implemented)
Implemented as of 2026-07-16: `GetSprint` — used internally by `teamstorm_tasks_get` to enrich the task's sprint field. Implemented as of 2026-07-17 (later same day): `GetSprint` also exposed as a standalone tool (`teamstorm_sprints_get`), and `CreateSprint` (`teamstorm_sprints_create`). Still not implemented:
- `PATCH /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — PatchSprint
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — DeleteSprint (intentionally excluded: no delete tools)

### Statuses (1 endpoint remaining)
Implemented as of 2026-07-17: ListStatusCategories (`teamstorm_status_categories_list`), ListStatuses (`teamstorm_workspace_statuses_list`), GetStatus (`teamstorm_workspace_statuses_get`). Still not implemented:
- `POST /cwm/public/api/v1/workspaces/{workspace}/statuses` — CreateStatus

### TimeTracking (2 endpoints — entire tag, using internal API instead)
- `GET /cwm/public/api/v1/workspaces/time-tracking-entries` — GetTimeTrackingEntries
- `GET /cwm/public/api/v1/workspaces/time-tracking-entries/updates` — GetTimeTrackingEntriesUpdates

### Types (6 endpoints, 1 implemented)
- `POST /cwm/public/api/v1/workspaces/{workspace}/types` — CreateType
- `GET /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — GetType
- `PATCH /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — PatchType
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — DeleteType
- `POST /cwm/public/api/v1/workspaces/{workspace}/types/{type}/attributes/{attributeId}` — AddTypeAttribute
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/types/{type}/attributes/{attributeId}` — DeleteTypeAttribute

### UserGroups (2 endpoints — entire tag)
- All user group listing endpoints

### Users (2 endpoints remaining, 2 implemented)
Implemented as of 2026-07-20: ListUsers/GetUser (`teamstorm_users_list_all`/`teamstorm_users_get`, both global — see AGENTS.md "Пользователи"). Still not implemented (administrative, not requested):
- `POST /cwm/public/api/v1/users/block/{userId}` — BlockUser
- `POST /cwm/public/api/v1/users/unblock/{userId}` — UnblockUser

### Workflows (4 endpoints, 1 implemented)
- `POST /cwm/public/api/v1/workspaces/{workspace}/workflows` — CreateWorkflow
- `GET /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — GetWorkflow
- `PATCH /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — PatchWorkflow
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — DeleteWorkflow

### WorkitemAttachments (3 endpoints remaining — DELETE only, intentionally excluded, 6 implemented)
Implemented as of 2026-07-20: DownloadWorkitemAttachments (`teamstorm_attachments_download`, out-of-band download — see AGENTS.md "Загрузка и скачивание файлов"). Still not implemented:
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}` — DeleteWorkitemAttachment
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments` — DeleteWorkitemAttachments
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/versions/{attachmentVersion}` — DeleteWorkitemAttachmentVersion

### WorkitemAttributes (1 endpoint, 1 implemented)
- `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attributes/{attributeId}` — UpdateWorkitemAttribute

### WorkitemComments (3 endpoints, 3 implemented)
- `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — UpdateWorkitemComment
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — DeleteWorkitemComment
- `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}/visibility` — UpdateWorkitemCommentVisibilitySettings

### WorkitemLinks (1 endpoint remaining, 2 implemented)
Implemented as of 2026-07-17: CreateWorkitemLink (`teamstorm_task_links_create`), in addition to the pre-existing ListWorkitemLinks (`teamstorm_task_links_list`, response-shape bug also fixed this date). Still not implemented:
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/links/{linkId}` — DeleteWorkitemLink (intentionally excluded: no delete tools)

### Workitems (1 endpoint, 7 implemented)
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — DeleteWorkitem

### WorkitemsSharing (3 endpoints, 1 implemented)
- `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing` — CreateSharedWorkitemPermission
- `PATCH /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing/{permissionId}` — PatchSharedWorkitemPermission
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing/{permissionId}` — DeleteSharedWorkitemPermission

### WorkspaceGroups (6 endpoints — entire tag)
- All group management endpoints

### WorkspaceUsers (5 endpoints, 1 implemented)
- `POST /cwm/public/api/v1/workspaces/{workspace}/users/{userId}` — AddWorkspaceUser
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/users/{userId}` — RemoveWorkspaceUser
- `POST /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles/{roleId}` — AddUserRole
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles/{roleId}` — RemoveRoleForUser
- `GET /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles` — GetUserRoles

### Workspaces (3 endpoints remaining, 2 implemented)
Implemented as of 2026-07-17 (later same day): `GetWorkspace` (`teamstorm_workspaces_get`). Still not implemented:
- `POST /cwm/public/api/v1/workspaces` — CreateWorkspace
- `PATCH /cwm/public/api/v1/workspaces/{workspace}` — PatchWorkspace
- `DELETE /cwm/public/api/v1/workspaces/{workspace}` — DeleteWorkspace (intentionally excluded: no delete tools)

---

## Notes

### Coverage Patterns and Observations

1. **Core task operations are well covered**: The MCP server covers the essential CRUD for workitems — list, get, create, update, count, list by parent, list updated. Task delete is the one notable gap.

2. **Read-heavy implementation**: Most implemented endpoints are GET operations. Write operations covered: CreateWorkitem, PatchWorkitem, CreateWorkitemComment, UploadWorkitemAttachments, the Documents write endpoints (create, patch, block/unblock, sharing, workitem links, comments — added 2026-07-02), CreateFolder/PatchFolder (added 2026-07-02), CreateAttribute/PatchAttribute/AddAttributeOption/PatchAttributeOption (added 2026-07-13), CreatePortfolio/PatchPortfolio/CreatePortfolioElement/PatchPortfolioElement plus the workitem pin/unpin sub-resource endpoints (added 2026-07-15), and the two internal time-tracking endpoints.

3. **Entire feature areas have zero coverage**:
   - Document versions (DocumentVersions — 3 endpoints); DocumentAttachments now partially covered (2 of 9 — list + download, since 2026-07-20), core Documents, DocumentComments, DocumentLinks, DocumentsSharing, DocumentsStatuses covered since 2026-07-02 (except DELETE)
   - Git Integration Tokens — 6 endpoints
   - OpenID management — 4 endpoints
   - Role management — 5 endpoints
   - Workspace group management — 6 endpoints
   - Queries — 3 endpoints
   - Status management — 4 endpoints
   - User Groups — 2 endpoints
   - Providers — 1 endpoint

4. **Time Tracking uses internal API**: The MCP tools `teamstorm_time_entries_create` and `teamstorm_time_entries_list` call `/tasks/api/v1/workitems/{id}/time-tracking-entries` — an internal non-public API path that is not in the public swagger spec. The public swagger has `GetTimeTrackingEntries` and `GetTimeTrackingEntriesUpdates` at `/cwm/public/api/v1/workspaces/time-tracking-entries` which are not implemented.

5. **No delete/mutate operations for most non-task resources**: Workflows and types can only be read through MCP — no creation, modification, or deletion is supported for these resources. Folders support create and update (since 2026-07-02) but not delete; attributes support create/patch plus option add/patch (since 2026-07-13) but not delete; portfolios and portfolio elements support full create/patch plus workitem pin/unpin (since 2026-07-15) but not delete; sprints support create (since 2026-07-17) but not patch/delete; Agile boards support create (since 2026-07-17) but not delete (there is no PatchAgile in the public API); tasks/workitems and documents support full non-delete CRUD.

6. **Attachment upload and download both use two-step OOB processes** (since 2026-07-20 for download): upload is HTTP POST to `/upload` on the MCP server, then `teamstorm_attachments_attach_uploaded`; download is `teamstorm_attachments_download`/`teamstorm_document_attachments_download` (which fetch from TeamStorm and stage the file on the MCP server), then HTTP GET `/download/:id`. Both share the same auth mechanism (`validateUploadAuth`) and its limitation: only works when `TEAMSTORM_API_TOKEN` is configured server-side, not in multi-user HTTP mode with per-session tokens.

7. **Schema coverage is low (42%)**: Only schemas directly associated with implemented endpoints are used. All request body schemas for unimplemented write operations, plus most portfolio, document, and role schemas, are unused.

8. **The `GetAttribute` endpoint mismatch**: The MCP tool `teamstorm_attributes_list` maps to `ListAttributes` (GET workspace attributes). The individual `GetAttribute` endpoint (GET single attribute by ID) has no MCP tool. The `teamstorm_attributes_get` tool maps to `ListWorkitemAttributes` (workitem attributes), not `GetAttribute`.
