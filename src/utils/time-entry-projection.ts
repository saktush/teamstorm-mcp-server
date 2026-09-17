import type { TeamStormPublicTimeEntry, TeamStormTimeEntryUser } from '../client/types.js';
import { stripHtml, truncate } from './output.js';

export const TIME_ENTRY_FIELD_NAMES = [
  'id',
  'date',
  'spentTime',
  'description',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'deleteUserId',
  'deleteUser',
  'workitem',
  'author',
  'type',
] as const;

export const TIME_ENTRY_DEFAULT_FIELDS = TIME_ENTRY_FIELD_NAMES;
// Keep deletion metadata available in both output formats.
export const TIME_ENTRY_IDENTITY_FIELDS = TIME_ENTRY_DEFAULT_FIELDS;

// buildListResult cannot split a single row. Bound its text, including references.
const MAX_REFERENCE_CHARS = 500;
const MAX_DESCRIPTION_CHARS = 4000;

function compactText(value: string): string {
  return truncate(value, MAX_REFERENCE_CHARS);
}

function userRef(value: TeamStormTimeEntryUser | null): Record<string, string> | null {
  return value
    ? {
        id: compactText(value.id),
        displayName: compactText(value.displayName),
        username: compactText(value.username),
      }
    : null;
}

export function projectTimeEntry(
  entry: TeamStormPublicTimeEntry,
  fields: Set<string>,
  opts: { descriptionMaxChars: number }
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of [
    'id',
    'date',
    'spentTime',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'deleteUserId',
  ] as const) {
    if (fields.has(field)) {
      const value = entry[field];
      out[field] = typeof value === 'string' ? compactText(value) : value;
    }
  }
  if (fields.has('description')) {
    out.description =
      entry.description === null
        ? null
        : truncate(
            stripHtml(entry.description),
            Math.min(opts.descriptionMaxChars, MAX_DESCRIPTION_CHARS)
          );
  }
  if (fields.has('workitem')) {
    const { id, key, name, workspace } = entry.workitem;
    out.workitem = {
      id: compactText(id),
      key: compactText(key),
      name: compactText(name),
      workspace: {
        id: compactText(workspace.id),
        key: compactText(workspace.key),
        name: compactText(workspace.name),
      },
    };
  }
  if (fields.has('author')) out.author = userRef(entry.author);
  if (fields.has('deleteUser')) out.deleteUser = userRef(entry.deleteUser);
  if (fields.has('type') && entry.type !== undefined) {
    out.type = entry.type
      ? { id: compactText(entry.type.id), name: compactText(entry.type.name) }
      : null;
  }
  return out;
}
