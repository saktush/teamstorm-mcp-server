// Folders
export {
  listFolders,
  getFolder,
  getFolderTree,
  findFolder,
  createFolder,
  updateFolder,
  registerListFoldersTool,
  registerGetFolderTool,
  registerGetFolderTreeTool,
  registerFindFolderTool,
  registerCreateFolderTool,
  registerUpdateFolderTool,
} from './folders/index.js';
export {
  listFoldersSchema,
  getFolderSchema,
  getFolderTreeSchema,
  findFolderSchema,
  createFolderSchema,
  updateFolderSchema,
} from './folders/index.js';

// Workspaces
export {
  listWorkspaces,
  registerListWorkspacesTool,
  getWorkspace,
  registerGetWorkspaceTool,
} from './workspaces/index.js';
export { listWorkspacesSchema, getWorkspaceSchema } from './workspaces/index.js';

// Time Tracking
export {
  createTimeEntry,
  registerCreateTimeEntryTool,
  listTimeEntries,
  registerListTimeEntriesTool,
} from './time-tracking/index.js';

// Tasks
export {
  listTasks,
  getTask,
  createTask,
  updateTask,
  getTaskCount,
  listTasksByParent,
  listUpdatedTasks,
  registerListTasksTool,
  registerGetTaskTool,
  registerCreateTaskTool,
  registerUpdateTaskTool,
  registerGetTaskCountTool,
  registerListTasksByParentTool,
  registerListUpdatedTasksTool,
} from './tasks/index.js';
export {
  listTasksSchema,
  getTaskSchema,
  createTaskSchema,
  updateTaskSchema,
  getTaskCountSchema,
  listTasksByParentSchema,
  listUpdatedTasksSchema,
} from './tasks/index.js';

// Users
export { listUsers, registerListUsersTool } from './users/index.js';
export { listUsersSchema } from './users/index.js';

// Sprints
export {
  listSprints,
  registerListSprintsTool,
  getSprint,
  registerGetSprintTool,
  getBacklog,
  registerGetBacklogTool,
  createSprint,
  registerCreateSprintTool,
} from './sprints/index.js';
export {
  listSprintsSchema,
  getSprintSchema,
  getBacklogSchema,
  createSprintSchema,
} from './sprints/index.js';

// Agile
export {
  listAgileBoards,
  registerListAgileBoardsTool,
  getAgileBoard,
  registerGetAgileBoardTool,
  createAgileBoard,
  registerCreateAgileBoardTool,
} from './agile/index.js';
export {
  listAgileBoardsSchema,
  getAgileBoardSchema,
  createAgileBoardSchema,
} from './agile/index.js';

// Workflows
export { listWorkflows, registerListWorkflowsTool } from './workflows/index.js';
export { listWorkflowsSchema } from './workflows/index.js';

// Task Types
export { listTaskTypes, registerListTaskTypesTool } from './types/index.js';
export { listTaskTypesSchema } from './types/index.js';

// Comments
export {
  listTaskComments,
  createTaskComment,
  getCommentVisibility,
  registerListTaskCommentsTool,
  registerCreateTaskCommentTool,
  registerGetCommentVisibilityTool,
} from './comments/index.js';
export {
  listTaskCommentsSchema,
  createTaskCommentSchema,
  getCommentVisibilitySchema,
} from './comments/index.js';

// Attributes
export {
  getTaskAttributes,
  listAttributes,
  createAttribute,
  updateAttribute,
  addAttributeOption,
  updateAttributeOption,
  registerGetTaskAttributesTool,
  registerListAttributesTool,
  registerCreateAttributeTool,
  registerUpdateAttributeTool,
  registerAddAttributeOptionTool,
  registerUpdateAttributeOptionTool,
} from './attributes/index.js';
export {
  getTaskAttributesSchema,
  listAttributesSchema,
  createAttributeSchema,
  updateAttributeSchema,
  addAttributeOptionSchema,
  updateAttributeOptionSchema,
} from './attributes/index.js';

// Attachments
export {
  listTaskAttachments,
  getTaskAttachment,
  listAttachmentVersions,
  getAttachmentVersion,
  attachUploadedFile,
  registerListTaskAttachmentsTool,
  registerGetTaskAttachmentTool,
  registerListAttachmentVersionsTool,
  registerGetAttachmentVersionTool,
  registerAttachUploadedFileTool,
} from './attachments/index.js';
export {
  ListTaskAttachmentsSchema,
  getTaskAttachmentSchema,
  listAttachmentVersionsSchema,
  getAttachmentVersionSchema,
  attachUploadedFileSchema,
} from './attachments/index.js';

// Permissions (Sharing)
export { getTaskPermissions, registerGetTaskPermissionsTool } from './permissions/index.js';
export { getTaskPermissionsSchema } from './permissions/index.js';

// Links
export { getTaskLinks, registerGetTaskLinksTool } from './links/index.js';
export { getTaskLinksSchema } from './links/index.js';
export { createTaskLink, registerCreateTaskLinkTool } from './links/index.js';
export { createTaskLinkSchema } from './links/index.js';

// Link Types
export { listLinkTypes, registerListLinkTypesTool } from './link-types/index.js';
export { listLinkTypesSchema } from './link-types/index.js';

// Status Categories
export {
  listStatusCategories,
  registerListStatusCategoriesTool,
} from './status-categories/index.js';
export { listStatusCategoriesSchema } from './status-categories/index.js';

// Workspace Statuses (workitem-level, distinct from Document Statuses below)
export {
  listWorkspaceStatuses,
  registerListWorkspaceStatusesTool,
  getWorkspaceStatus,
  registerGetWorkspaceStatusTool,
} from './statuses/index.js';
export { listWorkspaceStatusesSchema, getWorkspaceStatusSchema } from './statuses/index.js';

// Documents
export {
  listDocuments,
  getDocument,
  createDocument,
  updateDocument,
  blockDocument,
  unblockDocument,
  registerListDocumentsTool,
  registerGetDocumentTool,
  registerCreateDocumentTool,
  registerUpdateDocumentTool,
  registerBlockDocumentTool,
  registerUnblockDocumentTool,
} from './documents/index.js';
export {
  listDocumentsSchema,
  getDocumentSchema,
  createDocumentSchema,
  updateDocumentSchema,
  blockDocumentSchema,
  unblockDocumentSchema,
} from './documents/index.js';

// Document Sharing
export {
  listDocumentPermissions,
  shareDocument,
  updateDocumentPermission,
  registerListDocumentPermissionsTool,
  registerShareDocumentTool,
  registerUpdateDocumentPermissionTool,
} from './document-sharing/index.js';
export {
  listDocumentPermissionsSchema,
  shareDocumentSchema,
  updateDocumentPermissionSchema,
} from './document-sharing/index.js';

// Document Statuses
export {
  listDocumentStatuses,
  getDocumentStatus,
  registerListDocumentStatusesTool,
  registerGetDocumentStatusTool,
} from './document-statuses/index.js';
export { listDocumentStatusesSchema, getDocumentStatusSchema } from './document-statuses/index.js';

// Document Links
export {
  getDocumentTaskLinks,
  linkDocumentToTask,
  getTaskDocumentLinks,
  registerGetDocumentTaskLinksTool,
  registerLinkDocumentToTaskTool,
  registerGetTaskDocumentLinksTool,
} from './document-links/index.js';
export {
  getDocumentTaskLinksSchema,
  linkDocumentToTaskSchema,
  getTaskDocumentLinksSchema,
} from './document-links/index.js';

// Document Comments
export {
  listDocumentComments,
  createDocumentComment,
  registerListDocumentCommentsTool,
  registerCreateDocumentCommentTool,
} from './document-comments/index.js';
export {
  listDocumentCommentsSchema,
  createDocumentCommentSchema,
} from './document-comments/index.js';

// Portfolios
export {
  listPortfolios,
  getPortfolio,
  createPortfolio,
  updatePortfolio,
  registerListPortfoliosTool,
  registerGetPortfolioTool,
  registerCreatePortfolioTool,
  registerUpdatePortfolioTool,
} from './portfolios/index.js';
export {
  listPortfoliosSchema,
  getPortfolioSchema,
  createPortfolioSchema,
  updatePortfolioSchema,
} from './portfolios/index.js';

// Portfolio Elements
export {
  listPortfolioElements,
  getPortfolioElement,
  createPortfolioElement,
  updatePortfolioElement,
  registerListPortfolioElementsTool,
  registerGetPortfolioElementTool,
  registerCreatePortfolioElementTool,
  registerUpdatePortfolioElementTool,
} from './portfolio-elements/index.js';
export {
  listPortfolioElementsSchema,
  getPortfolioElementSchema,
  createPortfolioElementSchema,
  updatePortfolioElementSchema,
} from './portfolio-elements/index.js';

// Portfolio Links (task <-> portfolio element)
export {
  setTaskPortfolioElement,
  removeTaskPortfolioElement,
  getTasksByPortfolioElementName,
  registerSetTaskPortfolioElementTool,
  registerRemoveTaskPortfolioElementTool,
  registerGetTasksByPortfolioElementNameTool,
} from './portfolio-links/index.js';
export {
  setTaskPortfolioElementSchema,
  removeTaskPortfolioElementSchema,
  getTasksByPortfolioElementNameSchema,
} from './portfolio-links/index.js';
