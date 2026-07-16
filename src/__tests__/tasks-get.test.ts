import { describe, it, expect, vi } from 'vitest';
import { getTask } from '../tools/tasks/get.js';
import type { TeamStormClient } from '../client/teamstorm.js';
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

function buildClient(overrides: {
  getTask: ReturnType<typeof vi.fn>;
  getSprint?: ReturnType<typeof vi.fn>;
}): TeamStormClient {
  return {
    hasBaseUrl: () => true,
    setBaseUrl: vi.fn(),
    getTask: overrides.getTask,
    getSprint: overrides.getSprint ?? vi.fn(),
  } as unknown as TeamStormClient;
}

describe('getTask handler - sprint enrichment', () => {
  it('enriches task.sprint with full sprint details via client.getSprint', async () => {
    const task = buildTask({ sprint: { id: 'sp1', name: 'Sprint 5' } });
    const getSprint = vi.fn().mockResolvedValue({
      id: 'sp1',
      name: 'Sprint 5',
      startDate: '2024-02-01T00:00:00Z',
      endDate: '2024-02-14T00:00:00Z',
      description: 'Ship the enrichment feature',
    });
    const client = buildClient({ getTask: vi.fn().mockResolvedValue(task), getSprint });

    const result = await getTask(client, { workspace: 'ws1', taskId: 'TS-1' });

    expect(getSprint).toHaveBeenCalledWith('sp1', 'ws1');
    expect(result.structuredContent?.sprint).toEqual({
      id: 'sp1',
      name: 'Sprint 5',
      startDate: '2024-02-01T00:00:00Z',
      endDate: '2024-02-14T00:00:00Z',
      description: 'Ship the enrichment feature',
    });
  });

  it('falls back to the thumb-level sprint when client.getSprint fails', async () => {
    const task = buildTask({ sprint: { id: 'sp1', name: 'Sprint 5' } });
    const getSprint = vi.fn().mockRejectedValue(new Error('sprint deleted'));
    const client = buildClient({ getTask: vi.fn().mockResolvedValue(task), getSprint });

    const result = await getTask(client, { workspace: 'ws1', taskId: 'TS-1' });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.sprint).toEqual({ id: 'sp1', name: 'Sprint 5' });
  });

  it('does not call getSprint when the task has no sprint', async () => {
    const task = buildTask();
    const getSprint = vi.fn();
    const client = buildClient({ getTask: vi.fn().mockResolvedValue(task), getSprint });

    await getTask(client, { workspace: 'ws1', taskId: 'TS-1' });

    expect(getSprint).not.toHaveBeenCalled();
  });
});
