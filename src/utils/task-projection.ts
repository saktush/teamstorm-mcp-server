import type { TeamStormTask } from '../client/types.js';
import { toCompactAttributeValue } from './attribute-format.js';
import { stripHtml, truncate } from './output.js';

/**
 * Проекция задачи в компактный JSON для `structuredContent`.
 *
 * Плоские ссылки вместо вложенных объектов: раньше в ответ уезжал целиком
 * `TeamStormTask` со всеми пользователями, workflow, workspace и HTML-описанием.
 */

export const TASK_FIELD_NAMES = [
  'id',
  'key',
  'name',
  'description',
  'type',
  'status',
  'assignee',
  'author',
  'sprint',
  'folder',
  'parent',
  'workflow',
  'dueDate',
  'startDate',
  'endDate',
  'createdDate',
  'changeDate',
  'storyPoints',
  'originalEstimate',
  'timeSpent',
  'remainingEstimate',
  'workspace',
  'portfolios',
  'attributes',
] as const;

/** Что возвращается, если `fields` не задан. */
export const TASK_DEFAULT_FIELDS = [
  'id',
  'key',
  'name',
  'status',
  'assignee',
  'type',
  'dueDate',
] as const;

/** Минимум, который уезжает в structuredContent в markdown-режиме. */
export const TASK_IDENTITY_FIELDS = ['id', 'key', 'name'] as const;

interface NamedRef {
  id?: string;
  name?: string;
}

function ref(value: NamedRef | undefined): { id: string; name: string } | null {
  return value ? { id: value.id ?? '', name: value.name ?? '' } : null;
}

// `parent` resolves to TreeNodeThumbModel {id, nodeType} — it has no `name` (unlike
// `folder`, which is FolderThumbModel {id, name}). Reusing `ref()` here used to
// silently emit `{id, name: ''}`, dropping the one piece of information (nodeType)
// the API actually sends. See F2 in task-2a-brief.md.
function treeNodeRef(value: TeamStormTask['parent']): { id: string; nodeType: string } | null {
  return value ? { id: value.id, nodeType: value.nodeType } : null;
}

function userRef(
  value: TeamStormTask['assignee']
): { id: string; displayName: string; username: string } | null {
  return value ? { id: value.id, displayName: value.displayName, username: value.username } : null;
}

export function projectTask(
  task: TeamStormTask,
  fields: Set<string>,
  opts: { descriptionMaxChars: number }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const want = (f: string) => fields.has(f);

  if (want('id')) out.id = task.id;
  if (want('key')) out.key = task.key;
  if (want('name')) out.name = task.name;

  // description отдаём только по явному запросу — это и есть основной источник веса.
  if (want('description')) {
    out.description = task.description
      ? truncate(stripHtml(task.description), opts.descriptionMaxChars)
      : '';
  }

  if (want('type')) out.type = ref(task.type);
  if (want('workflow')) out.workflow = ref(task.workflow);
  if (want('status')) {
    out.status = task.status
      ? { id: task.status.id, name: task.status.name, category: task.status.category?.name ?? null }
      : null;
  }
  if (want('assignee')) out.assignee = userRef(task.assignee);
  if (want('author')) out.author = userRef(task.author);
  if (want('sprint')) out.sprint = ref(task.sprint);
  if (want('folder')) out.folder = ref(task.folder);
  if (want('parent')) out.parent = treeNodeRef(task.parent);
  if (want('workspace')) out.workspace = task.workspace ? task.workspace.key : null;

  for (const dateField of [
    'dueDate',
    'startDate',
    'endDate',
    'createdDate',
    'changeDate',
  ] as const) {
    if (want(dateField)) {
      out[dateField] = (task as unknown as Record<string, unknown>)[dateField] ?? null;
    }
  }

  for (const num of [
    'storyPoints',
    'originalEstimate',
    'timeSpent',
    'remainingEstimate',
  ] as const) {
    if (want(num)) out[num] = task[num];
  }

  if (want('portfolios')) {
    out.portfolios = (task.portfolios ?? []).map((p) => ({ id: p.id, name: p.name }));
  }

  if (want('attributes')) {
    out.attributes = (task.attributes ?? []).map((attr) => ({
      id: attr.id,
      name: attr.name,
      type: attr.type,
      value: toCompactAttributeValue(attr),
    }));
  }

  return out;
}
