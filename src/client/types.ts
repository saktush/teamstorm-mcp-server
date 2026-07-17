// TeamStorm API types

export interface TeamStormUser {
  id: string;
  displayName: string;
  username: string;
  email: string;
}

export interface TeamStormStatus {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
}

export interface TeamStormType {
  id: string;
  name: string;
  icon?: string;
}

export interface TeamStormWorkflow {
  id: string;
  name: string;
  description?: string;
}

export interface TeamStormSprintTeamMember {
  user: TeamStormUser;
  hoursPerDay: number;
  daysOff: number;
}

export interface TeamStormSprint {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  state?: 'New' | 'Active' | 'Completed' | null;
  workdays?: number | null;
  isBacklog: boolean;
  team?: TeamStormSprintTeamMember[] | null;
}

export interface TeamStormCreateSprintRequest {
  agileId: string;
  name: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  workdays: number;
  copyViewsFromSprint?: string | null;
  estimatedStoryPoints: number;
  team: Array<{ userId: string; daysOff?: number; hoursPerDay?: number }>;
}

export interface TeamStormFolder {
  id: string;
  name: string;
  nodeType: 'Folder' | 'WorkItem';
}

export interface TeamStormAttribute {
  type: 'UniString' | 'Number' | 'Date' | 'UniSelect' | 'Tag' | 'User' | 'TimeDuration';
  id: string;
  name: string;
  description: string;
  value: string | number | string[] | TeamStormUser | { id: string; name: string } | null;
}

export interface TeamStormPortfolio {
  id: string;
  name: string;
  elements: Array<{
    id: string;
    name: string;
  }>;
}

// Portfolios / PortfolioElements (top-level entities, distinct from the
// WorkitemPortfolioModel above which only appears embedded in TeamStormTask)
export interface TeamStormFolderThumb {
  id: string;
  name: string;
}

export interface TeamStormWorkflowThumb {
  id: string;
  name: string;
}

export interface TeamStormPortfolioThumb {
  id: string;
  name: string;
}

export interface TeamStormPortfolioElementThumb {
  id: string;
  name: string;
}

export interface TeamStormPortfolioModel {
  id: string;
  name: string;
  description?: string | null;
  folder: TeamStormFolderThumb;
  elements: TeamStormPortfolioElementThumb[];
  workflow?: TeamStormWorkflowThumb | null;
}

export interface TeamStormPortfolioModelList {
  items: TeamStormPortfolioModel[];
}

export interface TeamStormCreatePortfolioRequest {
  name: string;
  folderId: string;
}

export interface TeamStormPatchPortfolioRequest {
  name: string;
}

export interface TeamStormPortfolioElementModel {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: TeamStormStatus;
  responsibles: TeamStormUser[];
  portfolio: TeamStormPortfolioThumb;
}

export interface TeamStormPortfolioElementModelList {
  items: TeamStormPortfolioElementModel[];
}

export interface TeamStormCreatePortfolioElementRequest {
  portfolioId: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  responsibles?: string[] | null;
}

export interface TeamStormPatchPortfolioElementRequest {
  name?: string | null;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string | null;
  responsibles?: string[] | null;
}

export interface TeamStormWorkspace {
  id: string;
  key: string;
  name: string;
  description: string;
  author: TeamStormUser;
}

export interface TeamStormWorkspaceListResponse {
  fromToken?: string | null;
  maxItemsCount?: number | null;
  nextToken?: string | null;
  items: Array<{ id: string; key: string; name: string }>;
}

export interface TeamStormTask {
  id: string;
  key: string;
  name: string;
  description: string;
  type: TeamStormType;
  workflow: TeamStormWorkflow;
  status: TeamStormStatus;
  startDate?: string;
  endDate?: string;
  createdDate: string;
  dueDate?: string;
  assignee?: TeamStormUser;
  author: TeamStormUser;
  sprint?: TeamStormSprint;
  folder?: TeamStormFolder;
  originalEstimate: number;
  timeSpent: number;
  remainingEstimate: number;
  storyPoints: number;
  changedBy: TeamStormUser;
  parent?: TeamStormFolder;
  attributes: TeamStormAttribute[];
  portfolios: TeamStormPortfolio[];
  workspace: TeamStormWorkspace;
}

// Paginated list responses
export interface TeamStormTaskListResponse {
  fromToken: string;
  maxItemsCount: number;
  nextToken: string;
  items: TeamStormTask[];
}

export interface TeamStormTaskCountResponse {
  count: number;
}

export interface TeamStormCreateTaskRequest {
  name: string;
  description?: string;
  type: string;
  workflow?: string;
  status?: string;
  dueDate?: string;
  assignee?: string;
  sprintId?: string;
  originalEstimate?: number;
  storyPoints?: number;
  parentId?: string;
  attributes?: Array<{
    type: string;
    id: string;
    value?: unknown;
  }>;
  portfolioElementIds?: string[];
}

export interface TeamStormUpdateTaskRequest {
  name?: string;
  description?: string;
  type?: string;
  workflowId?: string;
  status?: string;
  startDate?: string;
  dueDate?: string;
  assignee?: string;
  sprintId?: string;
  originalEstimate?: number;
  storyPoints?: number;
  parentId?: string;
  portfolioElementIds?: string[];
}

// ============ NEW TYPES FOR READ OPERATIONS ============

// Comments
export interface TeamStormComment {
  id: string;
  text: string;
  author: TeamStormUser;
  createdAt: string;
  updatedAt: string;
}

export interface TeamStormCommentListResponse {
  items: TeamStormComment[];
}

export interface TeamStormCommentVisibility {
  visibilityType: 'All' | 'Workspace' | 'OnlySelected' | 'ExceptSelected';
  accessList: Array<{
    id: string;
    type?: 'User' | 'Group';
    user?: TeamStormUser;
    group?: { id: string; name: string };
  }>;
}

// Attributes
export interface TeamStormAttributeValue {
  type: 'UniString' | 'Number' | 'Date' | 'UniSelect' | 'Tag' | 'User' | 'TimeDuration';
  id: string;
  name: string;
  description: string;
  value: string | number | string[] | TeamStormUser | { id: string; name: string } | null;
}

export interface TeamStormAttributeListResponse {
  fromToken: string;
  maxItemsCount: number;
  nextToken: string;
  items: TeamStormAttributeValue[];
}

export type TeamStormAttributeType =
  | 'UniString'
  | 'Number'
  | 'Date'
  | 'UniSelect'
  | 'Tag'
  | 'User'
  | 'TimeDuration';

export interface TeamStormAttributeOption {
  id: string;
  name: string;
}

export interface TeamStormAttributeModel {
  id: string;
  name: string;
  description?: string | null;
  type: TeamStormAttributeType;
  options?: TeamStormAttributeOption[] | null;
  workitemTypes: Array<{ id: string; name: string }>;
}

export interface TeamStormCreateAttributeRequest {
  name: string;
  type: TeamStormAttributeType;
  description?: string;
  options?: Array<{ name: string }>;
}

export interface TeamStormPatchAttributeRequest {
  name?: string;
  description?: string;
  options?: Array<{ id?: string; name: string }>;
}

export interface TeamStormCreateAttributeOptionRequest {
  id?: string;
  name: string;
}

export interface TeamStormPatchAttributeOptionRequest {
  id: string;
  name: string;
}

// Attachments
export interface TeamStormAttachment {
  attachmentId: string;
  workspaceId: string;
  createdBy: TeamStormUser;
  fileId: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface TeamStormAttachmentVersion {
  attachmentId: string;
  workspaceId: string;
  createdBy: TeamStormUser;
  fileId: string;
  name: string;
  version: number;
  type: string;
  size: number;
  createdAt: string;
}

export interface TeamStormAttachmentListResponse {
  fromToken: string;
  maxItemsCount: number;
  nextToken: string;
  items: TeamStormAttachment[];
}

export interface TeamStormAttachmentVersionListResponse {
  fromToken: string;
  maxItemsCount: number;
  nextToken: string;
  items: TeamStormAttachmentVersion[];
}

// Sharing / Access Control
export interface TeamStormPermission {
  type?: 'User' | 'Group';
  permissionId: string;
  workspaceId: string;
  workitemId: string;
  accessLevel: 'Read' | 'Edit' | 'Comment';
  user?: TeamStormUser;
  group?: { id: string; name: string };
}

export interface TeamStormPermissionListResponse {
  items: TeamStormPermission[];
}

// Links (task relationships)
// GET /workspaces/{workspace}/workitems/{workitem}/links returns a bare array
// (no `items` wrapper) where each entry embeds the FULL linked workitem — verified
// live against a real workspace, matches swagger's WorkitemLinkModel exactly.
export interface TeamStormLinkType {
  id: string;
  name: string;
  key: string | null;
}

export interface TeamStormLink {
  id: string;
  type: TeamStormLinkType;
  linkedWorkitem: TeamStormTask;
}

export type TeamStormLinkListResponse = TeamStormLink[];

export interface TeamStormLinkTypeListResponse {
  items: TeamStormLinkType[];
}

export interface TeamStormCreateTaskLinkRequest {
  type: string;
  linkedWorkitem: string;
}

// Statuses (workitem-level, distinct from TeamStormDocumentStatus)
export interface TeamStormStatusCategory {
  id: string;
  name: string;
}

export interface TeamStormStatusCategoryListResponse {
  items: TeamStormStatusCategory[];
}

export interface TeamStormWorkspaceStatusListResponse {
  items: TeamStormStatus[];
}

// Updated tasks
export interface TeamStormUpdatedTask {
  id: string;
  key: string;
  name: string;
  status: TeamStormStatus;
  changedDate: string;
}

export interface TeamStormUpdatedTaskListResponse {
  fromToken: string;
  maxItemsCount: number;
  nextToken: string;
  items: TeamStormUpdatedTask[];
}

// Folders
export interface TeamStormFolderModel {
  id: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
}

export interface TeamStormFolderListResponse {
  fromToken?: string | null;
  maxItemsCount?: number | null;
  nextToken?: string | null;
  items: TeamStormFolderModel[];
}

export interface TeamStormCreateFolderRequest {
  name: string;
  description?: string;
  parentId?: string;
}

export interface TeamStormPatchFolderRequest {
  name?: string;
  description?: string;
  parentId?: string;
}

// New types for Phase B
export interface TeamStormUserListResponse {
  items: TeamStormUser[];
}

// Documents
export interface TeamStormDocumentStatus {
  id: string;
  name: string;
}

export interface TeamStormDocumentStatusListResponse {
  fromToken?: string | null;
  maxItemsCount?: number | null;
  nextToken?: string | null;
  items: TeamStormDocumentStatus[];
}

export interface TeamStormDocument {
  workspaceId: string;
  id: string;
  key: string;
  name: string;
  documentUrl: string;
  content?: string | null;
  createdAt: string;
  author: TeamStormUser;
  updatedAt: string;
  updatedBy?: TeamStormUser | null;
  parent?: { id: string; name: string; nodeType?: string } | null;
  version: number;
  versionUrl: string;
  labels: string[];
  isBlocked: boolean;
  status?: TeamStormDocumentStatus | null;
}

export interface TeamStormDocumentListResponse {
  fromToken?: string | null;
  maxItemsCount?: number | null;
  nextToken?: string | null;
  items: TeamStormDocument[];
}

export interface TeamStormCreateDocumentRequest {
  name: string;
  content?: string;
  parentId?: string;
  labels?: string[];
}

export interface TeamStormDocumentPermission {
  type: 'User' | 'Group';
  permissionId: string;
  workspaceId: string;
  documentId: string;
  accessLevel: 'Read' | 'Edit' | 'Comment';
  userId?: string;
  user?: TeamStormUser;
  groupId?: string;
  group?: { id: string; name: string };
}

export interface TeamStormSprintListResponse {
  items: TeamStormSprint[];
}

// Agile boards (owns the sprints/backlog of a folder — GET .../agile/{id})
export interface TeamStormAgile {
  id: string;
  name: string;
  folderId: string;
  estimatesType: 'EstimatesInTime' | 'EstimatesInStoryPoints';
}

// CreateAgileRequestBody has no `name` field (additionalProperties: false) even
// though AgileModel requires one in the response — the server derives it, likely
// from the folder's name. Don't add a name param when building this request.
export interface TeamStormCreateAgileRequest {
  folderId: string;
  estimatesType: 'EstimatesInTime' | 'EstimatesInStoryPoints';
}

export type TeamStormAgileListResponse = TeamStormAgile[];

export interface TeamStormWorkflowListResponse {
  items: TeamStormWorkflow[];
}

export interface TeamStormTypeListResponse {
  items: TeamStormType[];
}
