# TeamStorm OpenAPI → MCP Coverage Report

Generated: 2026-07-01 (updated: 2026-07-02 — added Documents, DocumentsSharing, DocumentsStatuses, DocumentLinks, DocumentComments tools; added Folders create/update tools; updated: 2026-07-13 — added Attributes create/patch tools: CreateAttribute, PatchAttribute, AddAttributeOption, PatchAttributeOption; updated: 2026-07-15 — added Portfolios and PortfolioElements tools, including workitem pin/unpin and name-based lookup; updated: 2026-07-16 — fixed `teamstorm_get_task` to render embedded `portfolios` (previously silently dropped) and enriched its `sprint` field with full details via a new internal `GetSprint` call)

## Summary

- Total endpoints: 159
- Implemented: 59 (37%)
- Not implemented: 100 (63%)
- Total schemas: 179
- Schemas used: 52
- Schemas not used: 127

---

## Endpoints by Tag

### Agile

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — operationId: GetAgile — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — operationId: DeleteAgile — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/agile/list` — operationId: GetAgileExtensions — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/agile` — operationId: CreateAgile — NOT IMPLEMENTED

### Attributes

- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/attributes` — operationId: CreateAttribute — MCP tool: `teamstorm_create_attribute`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/attributes` — operationId: ListAttributes — MCP tool: `teamstorm_list_attributes`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: GetAttribute — MCP tool: `teamstorm_get_task_attributes` (via task attributes endpoint; note: this specific attribute-by-id endpoint is not directly called, but the task attributes GET is covered under WorkitemAttributes)
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: PatchAttribute — MCP tool: `teamstorm_update_attribute`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — operationId: DeleteAttribute — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options` — operationId: AddAttributeOption — MCP tool: `teamstorm_add_attribute_option`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options` — operationId: PatchAttributeOption — MCP tool: `teamstorm_update_attribute_option`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options/{optionId}` — operationId: DeleteAttributeOption — NOT IMPLEMENTED (intentionally: no delete tools)

### DocumentAttachments

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}` — operationId: GetDocumentAttachment — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}` — operationId: DeleteDocumentAttachment — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments` — operationId: GetDocumentAttachments — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments` — operationId: DeleteDocumentAttachments — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: GetDocumentAttachmentWithVersions — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: DeleteDocumentAttachmentVersion — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/versions` — operationId: GetDocumentAttachmentsWithVersions — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/upload` — operationId: UploadDocumentAttachments — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/attachments/{attachmentId}/download` — operationId: DownloadDocumentAttachments — NOT IMPLEMENTED

### DocumentComments

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments` — operationId: ListDocumentComments — MCP tool: `teamstorm_list_document_comments`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments` — operationId: CreateDocumentComment — MCP tool: `teamstorm_create_document_comment`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/comments/{commentId}` — operationId: DeleteDocumentComment — NOT IMPLEMENTED

### DocumentLinks

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: GetDocumentWorkitemLinks — MCP tool: `teamstorm_get_document_task_links`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: CreateDocumentWorkitemLink — MCP tool: `teamstorm_link_document_to_task`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/workitem-links` — operationId: DeleteDocumentWorkitemLink — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/document-links` — operationId: GetWorkitemDocumentLinks — MCP tool: `teamstorm_get_task_document_links`

### Documents

- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents` — operationId: CreateDocument — MCP tool: `teamstorm_create_document`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents` — operationId: ListDocuments — MCP tool: `teamstorm_list_documents`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: GetDocument — MCP tool: `teamstorm_get_document`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: DeleteDocument — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/documents/{document}` — operationId: PatchDocument — MCP tool: `teamstorm_update_document`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/block` — operationId: BlockDocument — MCP tool: `teamstorm_block_document`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/unblock` — operationId: UnblockDocument — MCP tool: `teamstorm_unblock_document`

### DocumentsSharing

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing` — operationId: ListSharedDocumentPermissions — MCP tool: `teamstorm_list_document_permissions`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing` — operationId: CreateSharedDocumentPermission — MCP tool: `teamstorm_share_document`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing/{permissionId}` — operationId: PatchSharedDocumentPermission — MCP tool: `teamstorm_update_document_permission`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/sharing/{permissionId}` — operationId: DeleteSharedDocumentPermission — NOT IMPLEMENTED

### DocumentsStatuses

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents-statuses` — operationId: ListDocumentStatuses — MCP tool: `teamstorm_list_document_statuses`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/documents-statuses/{status}` — operationId: GetDocumentsStatus — MCP tool: `teamstorm_get_document_status`

### DocumentVersions

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions` — operationId: ListDocumentVersions — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions/{documentVersion}` — operationId: GetDocumentByVersion — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/documents/{document}/versions/{documentVersion}` — operationId: DeleteDocumentVersion — NOT IMPLEMENTED

### Folders

- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/folders` — operationId: CreateFolder — MCP tool: `teamstorm_create_folder`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/folders` — operationId: ListFolders — MCP tool: `teamstorm_list_folders`, `teamstorm_get_folder_tree`, `teamstorm_find_folder`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: GetFolder — MCP tool: `teamstorm_get_folder`, `teamstorm_find_folder`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: PatchFolder — MCP tool: `teamstorm_update_folder`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — operationId: DeleteFolder — NOT IMPLEMENTED (intentionally: no delete tools)

### GitIntegrationTokens

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens` — operationId: ListTokens — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens` — operationId: CreateToken — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: GetToken — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: UpdateToken — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}` — operationId: DeleteTokenAsync — NOT IMPLEMENTED
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/git-integration-tokens/{tokenId}/refresh` — operationId: RefreshToken — NOT IMPLEMENTED

### LinkTypes

- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/link-types` — operationId: ListLinkTypes — NOT IMPLEMENTED

### OpenId

- [ ] `GET /cwm/public/api/v1/open-id/connections` — operationId: GetConnections — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/open-id/connections` — operationId: CreateConnection — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/open-id/connections/{connectionId}` — operationId: DeleteConnection — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/open-id/connections/{connectionId}/users` — operationId: CreateUser — NOT IMPLEMENTED

### PortfolioElements

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements` — operationId: ListPortfolioElements — MCP tool: `teamstorm_list_portfolio_elements`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements` — operationId: (no operationId) — MCP tool: `teamstorm_create_portfolio_element`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: GetPortfolioElement — MCP tool: `teamstorm_get_portfolio_element`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: (no operationId) — MCP tool: `teamstorm_update_portfolio_element`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` — operationId: (no operationId) — NOT IMPLEMENTED (intentionally: no delete tools)
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}/workitems/{workitem}` — operationId: (no operationId) — MCP tool: `teamstorm_set_task_portfolio_element` (accepts portfolioElementId or portfolioElementName)
- [x] `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}/workitems/{workitem}` — operationId: (no operationId) — MCP tool: `teamstorm_remove_task_portfolio_element` (accepts portfolioElementId or portfolioElementName)

### Portfolios

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolios` — operationId: ListPortfolios — MCP tool: `teamstorm_list_portfolios`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/portfolios` — operationId: (no operationId) — MCP tool: `teamstorm_create_portfolio`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` — operationId: GetPortfolio — MCP tool: `teamstorm_get_portfolio`
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` — operationId: (no operationId) — MCP tool: `teamstorm_update_portfolio`
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

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/sprints` — operationId: ListSprints — MCP tool: `teamstorm_list_sprints`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/sprints` — operationId: CreateSprint — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: GetSprint — used internally by `teamstorm_get_task` (`client.getSprint`) to enrich the task's embedded sprint thumb with full details (dates, description); not exposed as its own standalone tool
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: PatchSprint — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — operationId: DeleteSprint — NOT IMPLEMENTED

### StatusCategories

- [ ] `GET /cwm/public/api/v1/status-categories` — operationId: ListStatusCategories — NOT IMPLEMENTED

### Statuses

- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/statuses` — operationId: CreateStatus — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/statuses` — operationId: ListStatuses — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/statuses/{status}` — operationId: GetStatus — NOT IMPLEMENTED

### TimeTracking

- [ ] `GET /cwm/public/api/v1/workspaces/time-tracking-entries` — operationId: GetTimeTrackingEntries — NOT IMPLEMENTED (MCP uses internal `/tasks/api/v1/` endpoint instead)
- [ ] `GET /cwm/public/api/v1/workspaces/time-tracking-entries/updates` — operationId: GetTimeTrackingEntriesUpdates — NOT IMPLEMENTED

### Types

- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/types` — operationId: CreateType — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/types` — operationId: ListTypes — MCP tool: `teamstorm_list_task_types`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: GetType — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: PatchType — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/types/{type}` — operationId: DeleteType — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/types/{type}/attributes/{attributeId}` — operationId: AddTypeAttribute — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/types/{type}/attributes/{attributeId}` — operationId: DeleteTypeAttribute — NOT IMPLEMENTED

### UserGroups

- [ ] `GET /cwm/public/api/v1/user-groups` — operationId: ListUserGroups — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/user-groups/{group}` — operationId: GetUserGroup — NOT IMPLEMENTED

### Users

- [ ] `GET /cwm/public/api/v1/users` — operationId: ListUsers — NOT IMPLEMENTED (MCP uses workspace-scoped `/workspaces/{ws}/users` endpoint)
- [ ] `GET /cwm/public/api/v1/users/{user}` — operationId: GetUser — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/users/block/{userId}` — operationId: BlockUser — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/users/unblock/{userId}` — operationId: UnblockUser — NOT IMPLEMENTED

### Workflows

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workflows` — operationId: ListWorkflows — MCP tool: `teamstorm_list_workflows`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workflows` — operationId: CreateWorkflow — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: GetWorkflow — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: PatchWorkflow — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — operationId: DeleteWorkflow — NOT IMPLEMENTED

### WorkitemAttachments

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}` — operationId: GetWorkitemAttachment — MCP tool: `teamstorm_get_task_attachment`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}` — operationId: DeleteWorkitemAttachment — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments` — operationId: GetWorkitemAttachments — MCP tool: `teamstorm_list_task_attachments`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments` — operationId: DeleteWorkitemAttachments — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: GetWorkitemAttachmentWithVersions — MCP tool: `teamstorm_get_attachment_version`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/versions/{attachmentVersion}` — operationId: DeleteWorkitemAttachmentVersion — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/versions` — operationId: GetWorkitemAttachmentsWithVersions — MCP tool: `teamstorm_list_attachment_versions`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/upload` — operationId: UploadWorkitemAttachments — MCP tool: `teamstorm_attach_uploaded`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/download` — operationId: DownloadWorkitemAttachments — NOT IMPLEMENTED

### WorkitemAttributes

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attributes` — operationId: ListWorkitemAttributes — MCP tool: `teamstorm_get_task_attributes`
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attributes/{attributeId}` — operationId: UpdateWorkitemAttribute — NOT IMPLEMENTED

### WorkitemComments

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments` — operationId: ListWorkitemComments — MCP tool: `teamstorm_list_task_comments`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments` — operationId: CreateWorkitemComment — MCP tool: `teamstorm_create_task_comment`
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — operationId: UpdateWorkitemComment — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — operationId: DeleteWorkitemComment — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}/visibility` — operationId: GetWorkitemCommentVisibilitySettings — MCP tool: `teamstorm_get_comment_visibility`
- [ ] `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}/visibility` — operationId: UpdateWorkitemCommentVisibilitySettings — NOT IMPLEMENTED

### WorkitemLinks

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/links` — operationId: ListWorkitemLinks — MCP tool: `teamstorm_get_task_links`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/links` — operationId: CreateWorkitemLink — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/links/{linkId}` — operationId: DeleteWorkitemLink — NOT IMPLEMENTED

### Workitems

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems` — operationId: ListWorkitems — MCP tool: `teamstorm_list_tasks`
- [x] `POST /cwm/public/api/v1/workspaces/{workspace}/workitems` — operationId: CreateWorkitem — MCP tool: `teamstorm_create_task`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/by-parent/{parent}` — operationId: ListWorkitemsByParent — MCP tool: `teamstorm_list_tasks_by_parent`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: GetWorkitemById — MCP tool: `teamstorm_get_task`
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: DeleteWorkitem — NOT IMPLEMENTED
- [x] `PATCH /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}` — operationId: PatchWorkitem — MCP tool: `teamstorm_update_task`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/count` — operationId: GetWorkitemsCount — MCP tool: `teamstorm_get_task_count`
- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/updates` — operationId: ListWorkitemsUpdates — MCP tool: `teamstorm_list_updated_tasks`

### WorkitemsSharing

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/sharing` — operationId: ListSharedWorkitemPermissions — MCP tool: `teamstorm_get_task_permissions`
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

- [x] `GET /cwm/public/api/v1/workspaces/{workspace}/users` — operationId: GetWorkspaceUsers — MCP tool: `teamstorm_list_users`
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/users/{userId}` — operationId: AddWorkspaceUser — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/users/{userId}` — operationId: RemoveWorkspaceUser — NOT IMPLEMENTED
- [ ] `POST /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles/{roleId}` — operationId: AddUserRole — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles/{roleId}` — operationId: RemoveRoleForUser — NOT IMPLEMENTED
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}/users/{userId}/roles` — operationId: GetUserRoles — NOT IMPLEMENTED

### Workspaces

- [ ] `POST /cwm/public/api/v1/workspaces` — operationId: CreateWorkspace — NOT IMPLEMENTED
- [x] `GET /cwm/public/api/v1/workspaces` — operationId: ListWorkspaces — MCP tool: `teamstorm_list_workspaces`
- [ ] `GET /cwm/public/api/v1/workspaces/{workspace}` — operationId: GetWorkspace — NOT IMPLEMENTED
- [ ] `PATCH /cwm/public/api/v1/workspaces/{workspace}` — operationId: PatchWorkspace — NOT IMPLEMENTED
- [ ] `DELETE /cwm/public/api/v1/workspaces/{workspace}` — operationId: DeleteWorkspace — NOT IMPLEMENTED

---

## Note on Time Tracking Endpoints

The MCP tools `teamstorm_create_time_entry` and `teamstorm_list_time_entries` use an **internal API** path (`/tasks/api/v1/workitems/{id}/time-tracking-entries`) that is **NOT** part of the public OpenAPI spec (`swagger.json.1`). They do not map to the public `GetTimeTrackingEntries` or `GetTimeTrackingEntriesUpdates` endpoints.

---

## Schema / Data Types Coverage

- [x] `AgileModel` — referenced in Agile endpoints (not implemented in MCP)
- [ ] `AntivirusScanVerdict` — NOT USED in any MCP tool
- [x] `AttachmentModel` — used in MCP tools: `teamstorm_get_task_attachment`, `teamstorm_attach_uploaded`
- [x] `AttachmentModelList` — used in MCP tools: `teamstorm_list_task_attachments`, `teamstorm_attach_uploaded`
- [x] `AttributeModel` — used in MCP tools: `teamstorm_create_attribute`, `teamstorm_update_attribute`, `teamstorm_add_attribute_option`, `teamstorm_update_attribute_option`
- [x] `AttributeOptionModel` — used in MCP tools: `teamstorm_create_attribute`, `teamstorm_update_attribute`, `teamstorm_add_attribute_option`, `teamstorm_update_attribute_option` (options in AttributeModel response)
- [x] `AttributeType` — used in MCP tool: `teamstorm_create_attribute`
- [x] `AttributeValueModel` — used in MCP tool: `teamstorm_get_task_attributes`, `teamstorm_list_attributes`
- [x] `AttributeValueModelList` — used in MCP tool: `teamstorm_get_task_attributes`, `teamstorm_list_attributes`
- [x] `AttributesModelList` — used in MCP tool: `teamstorm_list_attributes`
- [x] `CommentModel` — used in MCP tools: `teamstorm_list_task_comments`, `teamstorm_create_task_comment`
- [x] `CommentModelList` — used in MCP tool: `teamstorm_list_task_comments`
- [x] `CommentVisibilitySettingsModel` — used in MCP tool: `teamstorm_get_comment_visibility`
- [ ] `CommentVisibilityType` — NOT USED in any MCP tool
- [ ] `CreateAgileRequestBody` — NOT USED in any MCP tool
- [x] `CreateAttributeOptionModel` — used in MCP tool: `teamstorm_create_attribute` (options array)
- [x] `CreateAttributeOptionRequestBody` — used in MCP tool: `teamstorm_add_attribute_option`
- [x] `CreateAttributeRequestBody` — used in MCP tool: `teamstorm_create_attribute`
- [ ] `CreateAttributeValueRequestBody` — NOT USED in any MCP tool
- [x] `CreateCommentRequestBody` — used in MCP tool: `teamstorm_create_task_comment`
- [ ] `CreateDateFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateDocumentRequestBody` — NOT USED in any MCP tool
- [ ] `CreateDocumentWorkitemLinkRequestBody` — NOT USED in any MCP tool
- [x] `CreateFolderRequestBody` — used in MCP tool: `teamstorm_create_folder`
- [ ] `CreateNumberFieldRequestBody` — NOT USED in any MCP tool
- [ ] `CreateOpenIdConnectionModel` — NOT USED in any MCP tool
- [ ] `CreateOpenIdUserModel` — NOT USED in any MCP tool
- [x] `CreatePortfolioElementRequestBody` — used in MCP tool: `teamstorm_create_portfolio_element`
- [x] `CreatePortfolioRequestBody` — used in MCP tool: `teamstorm_create_portfolio`
- [ ] `CreateRoleRequestBody` — NOT USED in any MCP tool
- [ ] `CreateSharedDocumentGroupPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedDocumentPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedDocumentUserPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedWorkitemGroupPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedWorkitemPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSharedWorkitemUserPermissionBody` — NOT USED in any MCP tool
- [ ] `CreateSprintRequestBody` — NOT USED in any MCP tool
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
- [x] `CreateWorkitemLinkRequestBody` — NOT USED in any MCP tool (CreateWorkitemLink not implemented)
- [x] `CreateWorkitemRequestBody` — used in MCP tool: `teamstorm_create_task`
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
- [ ] `EstimatesType` — NOT USED in any MCP tool
- [x] `FolderModel` — used in MCP tools: `teamstorm_get_folder`, `teamstorm_list_folders`, `teamstorm_find_folder`, `teamstorm_get_folder_tree`
- [x] `FolderModelList` — used in MCP tools: `teamstorm_list_folders`, `teamstorm_get_folder_tree`, `teamstorm_find_folder`
- [x] `FolderThumbModel` — used in MCP tool: `teamstorm_get_portfolio` (embedded `folder` field on `PortfolioModel`)
- [ ] `GroupModel` — NOT USED in any MCP tool
- [ ] `GroupModelList` — NOT USED in any MCP tool
- [ ] `GroupPrincipalModel` — NOT USED in any MCP tool
- [x] `LinkTypeModel` — used in MCP tool: `teamstorm_get_task_links`
- [x] `LinkTypeModelList` — NOT USED directly (ListLinkTypes not implemented, but LinkTypeModel used in links response)
- [ ] `NumberFieldValueModel` — NOT USED in any MCP tool
- [ ] `OpenIdConnectionModel` — NOT USED in any MCP tool
- [ ] `OptionModel` — NOT USED in any MCP tool
- [x] `PatchAttributeOptionModel` — used in MCP tool: `teamstorm_update_attribute` (options array)
- [x] `PatchAttributeOptionRequestBody` — used in MCP tool: `teamstorm_update_attribute_option`
- [x] `PatchAttributeRequestBody` — used in MCP tool: `teamstorm_update_attribute`
- [ ] `PatchDocumentRequestBody` — NOT USED in any MCP tool
- [x] `PatchFolderRequestBody` — used in MCP tool: `teamstorm_update_folder`
- [x] `PatchPortfolioElementRequestBody` — used in MCP tool: `teamstorm_update_portfolio_element`
- [x] `PatchPortfolioRequestBody` — used in MCP tool: `teamstorm_update_portfolio`
- [ ] `PatchRoleRequestBody` — NOT USED in any MCP tool
- [ ] `PatchSharedDocumentPermissionBody` — NOT USED in any MCP tool
- [ ] `PatchSharedWorkitemPermissionBody` — NOT USED in any MCP tool
- [ ] `PatchSprintRequestBody` — NOT USED in any MCP tool
- [ ] `PatchTransitionRequestBody` — NOT USED in any MCP tool
- [ ] `PatchTypeRequestBody` — NOT USED in any MCP tool
- [ ] `PatchWorkflowRequestBody` — NOT USED in any MCP tool
- [ ] `PatchWorkflowStatusRequestBody` — NOT USED in any MCP tool
- [x] `PatchWorkitemRequestBody` — used in MCP tool: `teamstorm_update_task`
- [ ] `PatchWorkspaceRequestBody` — NOT USED in any MCP tool
- [ ] `Permission` — NOT USED in any MCP tool
- [x] `PortfolioElementModel` — used in MCP tools: `teamstorm_get_portfolio_element`, `teamstorm_create_portfolio_element`, `teamstorm_update_portfolio_element`, `teamstorm_set_task_portfolio_element`
- [x] `PortfolioElementModelList` — used in MCP tools: `teamstorm_list_portfolio_elements`, `teamstorm_get_tasks_by_portfolio_element_name`
- [x] `PortfolioElementThumbModel` — used in MCP tool: `teamstorm_get_portfolio` (embedded `elements` field on `PortfolioModel`)
- [x] `PortfolioModel` — used in MCP tools: `teamstorm_get_portfolio`, `teamstorm_create_portfolio`, `teamstorm_update_portfolio`
- [x] `PortfolioModelList` — used in MCP tool: `teamstorm_list_portfolios`
- [x] `PortfolioThumbModel` — used in MCP tool: `teamstorm_get_portfolio_element` (embedded `portfolio` field on `PortfolioElementModel`)
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
- [x] `SharedWorkitemGroupPermissionModel` — used in MCP tool: `teamstorm_get_task_permissions`
- [x] `SharedWorkitemPermissionModel` — used in MCP tool: `teamstorm_get_task_permissions`
- [x] `SharedWorkitemUserPermissionModel` — used in MCP tool: `teamstorm_get_task_permissions`
- [ ] `SimpleRoleModel` — NOT USED in any MCP tool
- [ ] `SimpleRoleModelList` — NOT USED in any MCP tool
- [ ] `SprintMemberRequestBody` — NOT USED in any MCP tool
- [x] `SprintModel` — used in MCP tool: `teamstorm_list_sprints`
- [x] `SprintModelList` — used in MCP tool: `teamstorm_list_sprints`
- [ ] `SprintStates` — NOT USED in any MCP tool
- [x] `SprintThumbModel` — used in MCP tool: `teamstorm_get_task` (embedded `sprint` field on `WorkitemModel`, before being enriched via `GetSprint`)
- [ ] `StatusCategoryModel` — NOT USED in any MCP tool
- [ ] `StatusCategoryModelList` — NOT USED in any MCP tool
- [ ] `StatusModel` — NOT USED in any MCP tool
- [ ] `StatusModelList` — NOT USED in any MCP tool
- [ ] `SystemRoles` — NOT USED in any MCP tool
- [ ] `TagFieldValueModel` — NOT USED in any MCP tool
- [ ] `TeamMemberModel` — NOT USED in any MCP tool
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
- [x] `TypeModel` — used in MCP tool: `teamstorm_list_task_types`
- [x] `TypeModelList` — used in MCP tool: `teamstorm_list_task_types`
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
- [x] `UserModel` — used in MCP tool: `teamstorm_list_users`
- [ ] `UserModelList` — NOT USED in any MCP tool (MCP uses `UsersModelList` for workspace users)
- [x] `UserPrincipalModel` — used in MCP tool: `teamstorm_get_task_permissions`
- [x] `UsersModelList` — used in MCP tool: `teamstorm_list_users`
- [x] `WorkflowModel` — used in MCP tool: `teamstorm_list_workflows`
- [x] `WorkflowModelList` — used in MCP tool: `teamstorm_list_workflows`
- [ ] `WorkflowStatusModel` — NOT USED in any MCP tool
- [x] `WorkflowThumbModel` — used in MCP tool: `teamstorm_get_portfolio` (embedded optional `workflow` field on `PortfolioModel`)
- [ ] `WorkflowType` — NOT USED in any MCP tool
- [x] `WorkitemLinkModel` — used in MCP tool: `teamstorm_get_task_links`
- [x] `WorkitemModel` — used in MCP tools: `teamstorm_list_tasks`, `teamstorm_get_task`, `teamstorm_create_task`, `teamstorm_update_task`, `teamstorm_list_tasks_by_parent`, `teamstorm_list_updated_tasks`
- [x] `WorkitemModelList` — used in MCP tools: `teamstorm_list_tasks`
- [x] `WorkitemPortfolioModel` — used in MCP tool: `teamstorm_get_task` (embedded `portfolios` field on `WorkitemModel`)
- [x] `WorkitemsCountModel` — used in MCP tool: `teamstorm_get_task_count`
- [x] `WorkspaceModel` — used in MCP tool: `teamstorm_list_workspaces`
- [x] `WorkspaceModelList` — used in MCP tool: `teamstorm_list_workspaces`

---

## Not Implemented Endpoints (Summary List)

### Agile (4 endpoints)
- `GET /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — GetAgile — Agile
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/agile/{agileId}` — DeleteAgile — Agile
- `GET /cwm/public/api/v1/workspaces/{workspace}/agile/list` — GetAgileExtensions — Agile
- `POST /cwm/public/api/v1/workspaces/{workspace}/agile` — CreateAgile — Agile

### Attributes (2 endpoints remaining — DELETE only, intentionally excluded)
Implemented as of 2026-07-13: CreateAttribute (`teamstorm_create_attribute`), PatchAttribute (`teamstorm_update_attribute`), AddAttributeOption (`teamstorm_add_attribute_option`), PatchAttributeOption (`teamstorm_update_attribute_option`). Still not implemented:
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}` — DeleteAttribute (intentionally excluded: no delete tools)
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/attributes/{attributeId}/options/{optionId}` — DeleteAttributeOption (intentionally excluded: no delete tools)

### Documents (remaining gaps)
Implemented as of 2026-07-02: all Documents, DocumentsSharing, DocumentsStatuses, DocumentLinks, DocumentComments endpoints except DELETE (intentionally excluded). Still not implemented:
- All DELETE endpoints: DeleteDocument, DeleteSharedDocumentPermission, DeleteDocumentWorkitemLink, DeleteDocumentComment
- All DocumentAttachments endpoints (9)
- All DocumentVersions endpoints (3)

### Folders (1 endpoint)
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/folders/{folderId}` — DeleteFolder (intentionally excluded: no delete tools)

### GitIntegrationTokens (6 endpoints — entire tag)
- All 6 token management endpoints

### LinkTypes (1 endpoint)
- `GET /cwm/public/api/v1/workspaces/{workspace}/link-types` — ListLinkTypes

### OpenId (4 endpoints — entire tag)
- All 4 OpenID connection management endpoints

### Portfolios + PortfolioElements (2 endpoints remaining — DELETE only, intentionally excluded)
Implemented as of 2026-07-15: ListPortfolios/GetPortfolio/CreatePortfolio/PatchPortfolio (`teamstorm_list_portfolios`, `teamstorm_get_portfolio`, `teamstorm_create_portfolio`, `teamstorm_update_portfolio`); ListPortfolioElements/GetPortfolioElement/CreatePortfolioElement/PatchPortfolioElement (`teamstorm_list_portfolio_elements`, `teamstorm_get_portfolio_element`, `teamstorm_create_portfolio_element`, `teamstorm_update_portfolio_element`); the workitem pin/unpin sub-resource endpoints (`teamstorm_set_task_portfolio_element`, `teamstorm_remove_task_portfolio_element`); plus a combined name-based lookup tool (`teamstorm_get_tasks_by_portfolio_element_name`, not a 1:1 endpoint mapping — composes ListPortfolioElements + ListWorkitems). Still not implemented:
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolios/{portfolioId}` (intentionally excluded: no delete tools)
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/portfolio-elements/{portfolioElementId}` (intentionally excluded: no delete tools)

### Providers (1 endpoint)
- `GET /cwm/public/api/v1/providers` — GetProviders

### Queries (3 endpoints — entire tag)
- All query visibility and workitem query endpoints

### Roles (5 endpoints — entire tag)
- All role management endpoints

### Sprints (4 endpoints, 2 implemented)
- `POST /cwm/public/api/v1/workspaces/{workspace}/sprints` — CreateSprint
- `PATCH /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — PatchSprint
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/sprints/{sprintId}` — DeleteSprint

Implemented as of 2026-07-16: `GetSprint` — used internally by `teamstorm_get_task` to enrich the task's sprint field (not a standalone tool).

### StatusCategories + Statuses (4 endpoints — entire tags)
- All status and status category endpoints

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

### Users (4 endpoints — entire global user tag)
- `GET /cwm/public/api/v1/users` — ListUsers (global)
- `GET /cwm/public/api/v1/users/{user}` — GetUser
- `POST /cwm/public/api/v1/users/block/{userId}` — BlockUser
- `POST /cwm/public/api/v1/users/unblock/{userId}` — UnblockUser

### Workflows (4 endpoints, 1 implemented)
- `POST /cwm/public/api/v1/workspaces/{workspace}/workflows` — CreateWorkflow
- `GET /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — GetWorkflow
- `PATCH /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — PatchWorkflow
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workflows/{workflow}` — DeleteWorkflow

### WorkitemAttachments (3 endpoints, 5 implemented)
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}` — DeleteWorkitemAttachment
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments` — DeleteWorkitemAttachments
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/versions/{attachmentVersion}` — DeleteWorkitemAttachmentVersion
- `GET /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attachments/{attachmentId}/download` — DownloadWorkitemAttachments

### WorkitemAttributes (1 endpoint, 1 implemented)
- `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/attributes/{attributeId}` — UpdateWorkitemAttribute

### WorkitemComments (3 endpoints, 3 implemented)
- `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — UpdateWorkitemComment
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}` — DeleteWorkitemComment
- `PUT /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/comments/{commentId}/visibility` — UpdateWorkitemCommentVisibilitySettings

### WorkitemLinks (2 endpoints, 1 implemented)
- `POST /cwm/public/api/v1/workspaces/{workspace}/workitems/{workitem}/links` — CreateWorkitemLink
- `DELETE /cwm/public/api/v1/workspaces/{workspace}/links/{linkId}` — DeleteWorkitemLink

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

### Workspaces (4 endpoints, 1 implemented)
- `POST /cwm/public/api/v1/workspaces` — CreateWorkspace
- `GET /cwm/public/api/v1/workspaces/{workspace}` — GetWorkspace
- `PATCH /cwm/public/api/v1/workspaces/{workspace}` — PatchWorkspace
- `DELETE /cwm/public/api/v1/workspaces/{workspace}` — DeleteWorkspace

---

## Notes

### Coverage Patterns and Observations

1. **Core task operations are well covered**: The MCP server covers the essential CRUD for workitems — list, get, create, update, count, list by parent, list updated. Task delete is the one notable gap.

2. **Read-heavy implementation**: Most implemented endpoints are GET operations. Write operations covered: CreateWorkitem, PatchWorkitem, CreateWorkitemComment, UploadWorkitemAttachments, the Documents write endpoints (create, patch, block/unblock, sharing, workitem links, comments — added 2026-07-02), CreateFolder/PatchFolder (added 2026-07-02), CreateAttribute/PatchAttribute/AddAttributeOption/PatchAttributeOption (added 2026-07-13), CreatePortfolio/PatchPortfolio/CreatePortfolioElement/PatchPortfolioElement plus the workitem pin/unpin sub-resource endpoints (added 2026-07-15), and the two internal time-tracking endpoints.

3. **Entire feature areas have zero coverage**:
   - Agile boards (all 4 endpoints)
   - Document attachments and versions (DocumentAttachments — 9, DocumentVersions — 3); core Documents, DocumentComments, DocumentLinks, DocumentsSharing, DocumentsStatuses covered since 2026-07-02 (except DELETE)
   - Git Integration Tokens — 6 endpoints
   - OpenID management — 4 endpoints
   - Role management — 5 endpoints
   - Workspace group management — 6 endpoints
   - Queries — 3 endpoints
   - Status management — 4 endpoints
   - User Groups — 2 endpoints
   - Providers — 1 endpoint

4. **Time Tracking uses internal API**: The MCP tools `teamstorm_create_time_entry` and `teamstorm_list_time_entries` call `/tasks/api/v1/workitems/{id}/time-tracking-entries` — an internal non-public API path that is not in the public swagger spec. The public swagger has `GetTimeTrackingEntries` and `GetTimeTrackingEntriesUpdates` at `/cwm/public/api/v1/workspaces/time-tracking-entries` which are not implemented.

5. **No delete/mutate operations for most non-task resources**: Sprints, workflows, and types can only be read through MCP — no creation, modification, or deletion is supported for these resources. Folders support create and update (since 2026-07-02) but not delete; attributes support create/patch plus option add/patch (since 2026-07-13) but not delete; portfolios and portfolio elements support full create/patch plus workitem pin/unpin (since 2026-07-15) but not delete; tasks/workitems and documents support full non-delete CRUD.

6. **Attachment upload is partially covered**: Upload works via the two-step OOB process (HTTP POST to `/upload` on MCP server, then `teamstorm_attach_uploaded`). Download is not supported — there is no `DownloadWorkitemAttachments` implementation.

7. **Schema coverage is low (17%)**: Only schemas directly associated with implemented endpoints are used. All request body schemas for unimplemented write operations, plus all portfolio, document, role, and agile schemas, are unused.

8. **The `GetAttribute` endpoint mismatch**: The MCP tool `teamstorm_list_attributes` maps to `ListAttributes` (GET workspace attributes). The individual `GetAttribute` endpoint (GET single attribute by ID) has no MCP tool. The `teamstorm_get_task_attributes` tool maps to `ListWorkitemAttributes` (workitem attributes), not `GetAttribute`.
