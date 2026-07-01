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

export interface TeamStormSprint {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  goal?: string;
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
export interface TeamStormLink {
  id: string;
  linkType: {
    id: string;
    name: string;
  };
  source: {
    id: string;
    key: string;
    name: string;
  };
  target: {
    id: string;
    key: string;
    name: string;
  };
}

export interface TeamStormLinkListResponse {
  items: TeamStormLink[];
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

// New types for Phase B
export interface TeamStormUserListResponse {
  items: TeamStormUser[];
}

export interface TeamStormSprintListResponse {
  items: TeamStormSprint[];
}

export interface TeamStormWorkflowListResponse {
  items: TeamStormWorkflow[];
}

export interface TeamStormTypeListResponse {
  items: TeamStormType[];
}
