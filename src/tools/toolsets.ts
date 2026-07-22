import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { TeamStormClient } from '../client/teamstorm.js';
import { logger } from '../utils/logger.js';

import {
  // Tasks
  registerListTasksTool,
  registerGetTaskTool,
  registerCreateTaskTool,
  registerUpdateTaskTool,
  registerGetTaskCountTool,
  registerListTasksByParentTool,
  registerListUpdatedTasksTool,
  // Attributes
  registerGetTaskAttributesTool,
  registerListAttributesTool,
  registerCreateAttributeTool,
  registerUpdateAttributeTool,
  registerAddAttributeOptionTool,
  registerUpdateAttributeOptionTool,
  // Attachments
  registerListTaskAttachmentsTool,
  registerGetTaskAttachmentTool,
  registerListAttachmentVersionsTool,
  registerGetAttachmentVersionTool,
  registerAttachUploadedFileTool,
  registerGetTaskAttachmentFileTool,
  // Comments
  registerListTaskCommentsTool,
  registerCreateTaskCommentTool,
  registerGetCommentVisibilityTool,
  // Links
  registerGetTaskLinksTool,
  registerCreateTaskLinkTool,
  // Time Tracking
  registerCreateTimeEntryTool,
  registerListTimeEntriesTool,
  // Permissions (task sharing)
  registerGetTaskPermissionsTool,
  // Documents
  registerListDocumentsTool,
  registerGetDocumentTool,
  registerCreateDocumentTool,
  registerUpdateDocumentTool,
  registerBlockDocumentTool,
  registerUnblockDocumentTool,
  // Document Sharing
  registerListDocumentPermissionsTool,
  registerShareDocumentTool,
  registerUpdateDocumentPermissionTool,
  // Document Links
  registerGetDocumentTaskLinksTool,
  registerLinkDocumentToTaskTool,
  registerGetTaskDocumentLinksTool,
  // Document Comments
  registerListDocumentCommentsTool,
  registerCreateDocumentCommentTool,
  // Document Attachments
  registerListDocumentAttachmentsTool,
  registerGetDocumentAttachmentFileTool,
  // Document Statuses
  registerListDocumentStatusesTool,
  registerGetDocumentStatusTool,
  // Portfolios
  registerListPortfoliosTool,
  registerGetPortfolioTool,
  registerCreatePortfolioTool,
  registerUpdatePortfolioTool,
  // Portfolio Elements
  registerListPortfolioElementsTool,
  registerGetPortfolioElementTool,
  registerCreatePortfolioElementTool,
  registerUpdatePortfolioElementTool,
  // Portfolio Links
  registerSetTaskPortfolioElementTool,
  registerRemoveTaskPortfolioElementTool,
  registerGetTasksByPortfolioElementNameTool,
  // Sprints
  registerListSprintsTool,
  registerGetSprintTool,
  registerGetBacklogTool,
  registerCreateSprintTool,
  // Agile
  registerListAgileBoardsTool,
  registerGetAgileBoardTool,
  registerCreateAgileBoardTool,
  // Folders
  registerListFoldersTool,
  registerGetFolderTool,
  registerGetFolderTreeTool,
  registerFindFolderTool,
  registerCreateFolderTool,
  registerUpdateFolderTool,
  // Workspaces
  registerListWorkspacesTool,
  registerGetWorkspaceTool,
  // Users
  registerListUsersTool,
  registerGetUserTool,
  registerListAllUsersTool,
  // Workspace Statuses
  registerListWorkspaceStatusesTool,
  registerGetWorkspaceStatusTool,
  // Workflows
  registerListWorkflowsTool,
  // Task Types
  registerListTaskTypesTool,
  // Link Types
  registerListLinkTypesTool,
  // Status Categories
  registerListStatusCategoriesTool,
} from './index.js';

type ToolRegistrar = (server: McpServer, client: TeamStormClient) => void;

export type ToolsetName =
  | 'tasks'
  | 'documents'
  | 'portfolios'
  | 'planning'
  | 'structure'
  | 'reference';

/** `reference` is cross-cutting lookup data — always registered, cannot be disabled. */
export const ALWAYS_ON: ToolsetName[] = ['reference'];

/** The most common workflow surface, loaded when `default` is requested. */
export const DEFAULT_SET: ToolsetName[] = ['tasks', 'structure', 'reference'];

/**
 * Keyed registry mapping each toolset to its tool registrars.
 * Grouping mirrors the domain folders under `src/tools/`; sums to 80 tools.
 * A partition test guards that every registrar appears here exactly once.
 */
export const TOOLSETS: Record<ToolsetName, ToolRegistrar[]> = {
  // 27 — everything that hangs off a work item
  tasks: [
    // tasks (7)
    registerListTasksTool,
    registerGetTaskTool,
    registerCreateTaskTool,
    registerUpdateTaskTool,
    registerGetTaskCountTool,
    registerListTasksByParentTool,
    registerListUpdatedTasksTool,
    // attributes (6)
    registerGetTaskAttributesTool,
    registerListAttributesTool,
    registerCreateAttributeTool,
    registerUpdateAttributeTool,
    registerAddAttributeOptionTool,
    registerUpdateAttributeOptionTool,
    // attachments (6)
    registerListTaskAttachmentsTool,
    registerGetTaskAttachmentTool,
    registerListAttachmentVersionsTool,
    registerGetAttachmentVersionTool,
    registerAttachUploadedFileTool,
    registerGetTaskAttachmentFileTool,
    // comments (3)
    registerListTaskCommentsTool,
    registerCreateTaskCommentTool,
    registerGetCommentVisibilityTool,
    // links (2)
    registerGetTaskLinksTool,
    registerCreateTaskLinkTool,
    // time-tracking (2)
    registerCreateTimeEntryTool,
    registerListTimeEntriesTool,
    // permissions (1)
    registerGetTaskPermissionsTool,
  ],
  // 18 — documents and everything that hangs off them
  documents: [
    // documents (6)
    registerListDocumentsTool,
    registerGetDocumentTool,
    registerCreateDocumentTool,
    registerUpdateDocumentTool,
    registerBlockDocumentTool,
    registerUnblockDocumentTool,
    // document-sharing (3)
    registerListDocumentPermissionsTool,
    registerShareDocumentTool,
    registerUpdateDocumentPermissionTool,
    // document-links (3)
    registerGetDocumentTaskLinksTool,
    registerLinkDocumentToTaskTool,
    registerGetTaskDocumentLinksTool,
    // document-comments (2)
    registerListDocumentCommentsTool,
    registerCreateDocumentCommentTool,
    // document-attachments (2)
    registerListDocumentAttachmentsTool,
    registerGetDocumentAttachmentFileTool,
    // document-statuses (2)
    registerListDocumentStatusesTool,
    registerGetDocumentStatusTool,
  ],
  // 11
  portfolios: [
    // portfolios (4)
    registerListPortfoliosTool,
    registerGetPortfolioTool,
    registerCreatePortfolioTool,
    registerUpdatePortfolioTool,
    // portfolio-elements (4)
    registerListPortfolioElementsTool,
    registerGetPortfolioElementTool,
    registerCreatePortfolioElementTool,
    registerUpdatePortfolioElementTool,
    // portfolio-links (3)
    registerSetTaskPortfolioElementTool,
    registerRemoveTaskPortfolioElementTool,
    registerGetTasksByPortfolioElementNameTool,
  ],
  // 7
  planning: [
    // sprints (4)
    registerListSprintsTool,
    registerGetSprintTool,
    registerGetBacklogTool,
    registerCreateSprintTool,
    // agile (3)
    registerListAgileBoardsTool,
    registerGetAgileBoardTool,
    registerCreateAgileBoardTool,
  ],
  // 8
  structure: [
    // folders (6)
    registerListFoldersTool,
    registerGetFolderTool,
    registerGetFolderTreeTool,
    registerFindFolderTool,
    registerCreateFolderTool,
    registerUpdateFolderTool,
    // workspaces (2)
    registerListWorkspacesTool,
    registerGetWorkspaceTool,
  ],
  // 9 — cross-cutting read-only lookup data (always on)
  reference: [
    // users (3)
    registerListUsersTool,
    registerGetUserTool,
    registerListAllUsersTool,
    // statuses (2)
    registerListWorkspaceStatusesTool,
    registerGetWorkspaceStatusTool,
    // workflows (1)
    registerListWorkflowsTool,
    // types (1)
    registerListTaskTypesTool,
    // link-types (1)
    registerListLinkTypesTool,
    // status-categories (1)
    registerListStatusCategoriesTool,
  ],
};

const ALL_TOOLSETS = Object.keys(TOOLSETS) as ToolsetName[];

/**
 * Resolve a raw toolset selection string into the concrete set of enabled toolsets.
 *
 * - Undefined/blank input → all toolsets (backward compatible: no config = all 80 tools).
 * - Comma-separated list; keywords `all` (every toolset) and `default` (DEFAULT_SET) expand.
 * - Unknown names are dropped with a warning — never throws, so a typo can't 500 a session.
 * - `ALWAYS_ON` (reference) is always unioned in.
 * - If the parsed result is empty (input was non-blank garbage), falls back to DEFAULT_SET.
 */
export function resolveToolsets(raw?: string): Set<ToolsetName> {
  // No configuration anywhere → load everything (backward compatible).
  if (raw === undefined || raw.trim() === '') {
    return new Set(ALL_TOOLSETS);
  }

  const enabled = new Set<ToolsetName>();
  const unknown: string[] = [];

  for (const token of raw.split(',')) {
    const name = token.trim().toLowerCase();
    if (name === '') continue;
    if (name === 'all') {
      ALL_TOOLSETS.forEach((t) => enabled.add(t));
    } else if (name === 'default') {
      DEFAULT_SET.forEach((t) => enabled.add(t));
    } else if ((ALL_TOOLSETS as string[]).includes(name)) {
      enabled.add(name as ToolsetName);
    } else {
      unknown.push(name);
    }
  }

  if (unknown.length > 0) {
    logger.warn({ requested: raw, unknown }, 'Ignoring unknown toolset name(s)');
  }

  // Never register zero tools — a fully-garbage selection falls back to the default set.
  if (enabled.size === 0) {
    DEFAULT_SET.forEach((t) => enabled.add(t));
  }

  // reference is always on.
  ALWAYS_ON.forEach((t) => enabled.add(t));

  return enabled;
}

/** Register only the tools belonging to the enabled toolsets against a session's server. */
export function registerToolsets(
  server: McpServer,
  client: TeamStormClient,
  enabled: Set<ToolsetName>
): void {
  for (const name of enabled) {
    for (const register of TOOLSETS[name]) {
      register(server, client);
    }
  }
}

/** Register every tool (the pre-toolsets behavior). Thin wrapper for callers/tests. */
export function registerAllTools(server: McpServer, client: TeamStormClient): void {
  registerToolsets(server, client, resolveToolsets('all'));
}
