import { describe, it, expect } from 'vitest';
import { formatTaskMarkdown, formatDocumentMarkdown } from '../utils/formatters.js';
import type { TeamStormTask, TeamStormDocument } from '../client/types.js';

function buildTask(overrides: Partial<TeamStormTask> = {}): TeamStormTask {
  const user = { id: 'u1', displayName: 'Jane Doe', username: 'jane', email: 'jane@test.com' };

  return {
    id: 't1',
    key: 'TS-1',
    name: 'Test task',
    description: '',
    type: { id: 'type1', name: 'Task' },
    workflow: { id: 'wf1', name: 'Default' },
    status: { id: 's1', name: 'Open', category: { id: 'c1', name: 'Todo' } },
    createdDate: '2024-01-01T00:00:00Z',
    author: user,
    changedBy: user,
    originalEstimate: 0,
    timeSpent: 0,
    remainingEstimate: 0,
    storyPoints: 0,
    attributes: [],
    portfolios: [],
    workspace: {
      id: 'ws1',
      key: 'test-workspace',
      name: 'Test Workspace',
      description: '',
      author: user,
    },
    ...overrides,
  };
}

describe('formatTaskMarkdown', () => {
  it('renders portfolios with their pinned elements', () => {
    const task = buildTask({
      portfolios: [
        {
          id: 'p1',
          name: 'Product Portfolio',
          elements: [
            { id: 'e1', name: 'Q1 Roadmap' },
            { id: 'e2', name: 'Q2 Roadmap' },
          ],
        },
        { id: 'p2', name: 'Empty Portfolio', elements: [] },
      ],
    });

    const markdown = formatTaskMarkdown(task);

    expect(markdown).toContain('**Портфели**');
    expect(markdown).toContain('Product Portfolio (Q1 Roadmap, Q2 Roadmap)');
    expect(markdown).toContain('Empty Portfolio');
  });

  it('renders sprint dates and description when present', () => {
    const task = buildTask({
      sprint: {
        id: 'sp1',
        name: 'Sprint 5',
        startDate: '2024-02-01T00:00:00Z',
        endDate: '2024-02-14T00:00:00Z',
        description: 'Ship the enrichment feature',
        isBacklog: false,
      },
    });

    const markdown = formatTaskMarkdown(task);

    expect(markdown).toContain('**Спринт**: Sprint 5');
    expect(markdown).toContain('01.02.2024');
    expect(markdown).toContain('14.02.2024');
    expect(markdown).toContain('Ship the enrichment feature');
  });

  // Регрессия на баг из отчёта: «**Результат**: [object Object], [object Object]».
  // Формы значений подтверждены на живом API.
  it('renders every attribute type without [object Object]', () => {
    const task = buildTask({
      attributes: [
        { id: 'a1', name: 'Ссылка на AMO', description: '', type: 'UniString', value: 'https://x' },
        { id: 'a2', name: 'Оценка', description: '', type: 'Number', value: 42 },
        {
          id: 'a3',
          name: 'Желаемый срок',
          description: '',
          type: 'Date',
          value: '2026-07-08T21:00:00',
        },
        {
          id: 'a4',
          name: 'Приоритет',
          description: '',
          type: 'UniSelect',
          value: { id: 'o1', name: 'D (3-99)' },
        },
        {
          id: 'a5',
          name: 'Результат',
          description: '',
          type: 'Tag',
          value: [
            { id: 't1', name: 'Демо проведено' },
            { id: 't2', name: 'Нужен POC' },
          ],
        },
        {
          id: 'a6',
          name: 'Ответственный',
          description: '',
          type: 'User',
          value: {
            id: 'u2',
            displayName: 'Anastasia Ivanova',
            username: 'anastasia',
            email: 'a@test.com',
          },
        },
        { id: 'a7', name: 'Затрачено', description: '', type: 'TimeDuration', value: 5400 },
        { id: 'a8', name: 'Клиент', description: '', type: 'Tag', value: null },
      ],
    });

    const markdown = formatTaskMarkdown(task);

    expect(markdown).not.toContain('[object Object]');
    expect(markdown).not.toContain('Invalid Date');
    expect(markdown).toContain('- **Результат**: Демо проведено, Нужен POC');
    expect(markdown).toContain('- **Приоритет**: D (3-99)');
    expect(markdown).toContain('- **Ответственный**: Anastasia Ivanova');
    expect(markdown).toContain('- **Желаемый срок**: 08.07.2026');
    expect(markdown).toContain('- **Затрачено**: 1ч 30м');
    expect(markdown).toContain('- **Клиент**: Не заполнено');
  });
});

function buildDocument(overrides: Partial<TeamStormDocument> = {}): TeamStormDocument {
  const user = { id: 'u1', displayName: 'Jane Doe', username: 'jane', email: 'jane@test.com' };

  return {
    workspaceId: 'ws1',
    id: 'd1',
    key: 'DOC-1',
    name: 'Test document',
    documentUrl: 'https://x/documents/d1',
    createdAt: '2024-01-01T00:00:00Z',
    author: user,
    updatedAt: '2024-01-01T00:00:00Z',
    version: 1,
    versionUrl: 'https://x/documents/d1/versions/1',
    labels: [],
    isBlocked: false,
    ...overrides,
  };
}

describe('formatDocumentMarkdown', () => {
  // Regression for F2 (task-2a-brief.md): `parent` resolves to TreeNodeThumbModel
  // {id, nodeType} — it has no `name`. The formatter used to read `doc.parent.name`,
  // which doesn't exist on the real API response, and printed the literal word
  // "undefined" for every document with a parent.
  it('renders the parent node type and id, never the literal word "undefined"', () => {
    const doc = buildDocument({
      parent: { id: 'p1', nodeType: 'Folder' },
    });

    const markdown = formatDocumentMarkdown(doc);

    expect(markdown).not.toContain('undefined');
    expect(markdown).toContain('- Родитель: Folder (`p1`)');
  });

  it('omits the parent line entirely when there is no parent', () => {
    const doc = buildDocument({ parent: null });

    const markdown = formatDocumentMarkdown(doc);

    expect(markdown).not.toContain('Родитель');
  });
});
