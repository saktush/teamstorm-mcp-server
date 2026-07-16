import { describe, it, expect } from 'vitest';
import { formatTaskMarkdown } from '../utils/formatters.js';
import type { TeamStormTask } from '../client/types.js';

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
      },
    });

    const markdown = formatTaskMarkdown(task);

    expect(markdown).toContain('**Спринт**: Sprint 5');
    expect(markdown).toContain('01.02.2024');
    expect(markdown).toContain('14.02.2024');
    expect(markdown).toContain('Ship the enrichment feature');
  });
});
