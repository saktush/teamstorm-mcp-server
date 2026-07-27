import { describe, it, expect, vi } from 'vitest';
import { listUpdatedTasks } from '../tools/tasks/list-updated.js';
import type { TeamStormClient } from '../client/teamstorm.js';
import type { TeamStormUpdatedTask } from '../client/types.js';

const user = { id: 'u1', displayName: 'Jane Doe', username: 'jane', email: 'jane@test.com' };

/** Форма подтверждена сырым запросом к `/workspaces/CS/workitems/updates`. */
function buildUpdatedTask(overrides: Partial<TeamStormUpdatedTask> = {}): TeamStormUpdatedTask {
  return {
    id: 'de029d4f-e05b-4934-914c-b728115f8fa7',
    key: 'CS-4541',
    name: 'ПМИ Интер РАО',
    description: '<p>Прошу ознакомиться</p>',
    type: { id: 'type1', name: 'Заявка PreSales Help' },
    workflow: { id: 'wf1', name: 'Заявка PreSales Halp' },
    status: { id: 's1', name: 'Выполнено', category: { id: 'c1', name: 'Выполнено' } },
    createdDate: '2026-07-07T08:20:45.317733Z',
    changeDate: '2026-07-10T08:19:52.322744Z',
    author: user,
    changedBy: user,
    originalEstimate: 0,
    timeSpent: 0,
    remainingEstimate: 0,
    storyPoints: 0,
    attributes: [],
    portfolios: [],
    workspace: { id: 'ws1', key: 'CS', name: 'CS', description: '', author: user },
    ...overrides,
  };
}

function buildClient(items: TeamStormUpdatedTask[]): TeamStormClient {
  return {
    hasBaseUrl: () => true,
    setBaseUrl: vi.fn(),
    listUpdatedTasks: vi
      .fn()
      .mockResolvedValue({ fromToken: null, maxItemsCount: 50, nextToken: null, items }),
  } as unknown as TeamStormClient;
}

describe('listUpdatedTasks handler', () => {
  // Регрессия на баг из отчёта: все 55 строк печатались как «Дата изменения: Invalid Date»,
  // потому что код читал `changedDate`, а API отдаёт `changeDate`.
  it('renders the change date from the API field `changeDate`', async () => {
    const result = await listUpdatedTasks(buildClient([buildUpdatedTask()]), {
      workspace: 'CS',
      changedFromDate: '2026-07-10',
      maxItemsCount: 50,
      format: 'markdown',
    });

    const text = result.content[0].text;
    expect(text).not.toContain('Invalid Date');
    expect(text).toContain('CS-4541');
    expect(text).toContain('10.07.2026');
  });

  it('falls back to the placeholder when no change date is present at all', async () => {
    const task = buildUpdatedTask();
    delete (task as Partial<TeamStormUpdatedTask>).changeDate;

    const result = await listUpdatedTasks(buildClient([task]), {
      workspace: 'CS',
      changedFromDate: '2026-07-10',
      maxItemsCount: 50,
      format: 'markdown',
    });

    expect(result.content[0].text).not.toContain('Invalid Date');
  });
});
