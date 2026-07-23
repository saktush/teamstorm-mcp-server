import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { setTaskPortfolioElement } from '../../tools/portfolio-links/set.js';
import { removeTaskPortfolioElement } from '../../tools/portfolio-links/remove.js';
import { getTasksByPortfolioElementName } from '../../tools/portfolio-links/get-tasks-by-name.js';

const elementIdA = 'e0000000-0000-0000-0000-00000000000a';
const elementIdB = 'e0000000-0000-0000-0000-00000000000b';
const portfolioIdA = 'c0000000-0000-0000-0000-00000000000a';
const portfolioIdB = 'c0000000-0000-0000-0000-00000000000b';
const taskId = 'TS-1';

const mockElementA = {
  id: elementIdA,
  name: 'Feature X',
  description: null,
  startDate: null,
  endDate: null,
  status: { id: 's1', name: 'Open', category: { id: 'c1', name: 'Open' } },
  responsibles: [],
  portfolio: { id: portfolioIdA, name: 'Portfolio A' },
};

const mockElementB = {
  ...mockElementA,
  id: elementIdB,
  portfolio: { id: portfolioIdB, name: 'Portfolio B' },
};

describe('TeamStormClient Portfolio Links Integration Tests', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';
  const workspace = 'test-workspace';
  const token = 'test-token';

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient(token, baseUrl, workspace);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('assignWorkitemToPortfolioElement / unassignWorkitemFromPortfolioElement (client)', () => {
    it('should assign a workitem to a portfolio element', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolio-elements/${elementIdA}/workitems/${taskId}`)
        .reply(200, mockElementA);

      const result = await client.assignWorkitemToPortfolioElement(elementIdA, taskId, workspace);

      expect(result.id).toBe(elementIdA);
      expect(nock.isDone()).toBe(true);
    });

    it('should unassign a workitem from a portfolio element (204 no content)', async () => {
      nock(baseUrl)
        .delete(`/workspaces/${workspace}/portfolio-elements/${elementIdA}/workitems/${taskId}`)
        .reply(204);

      await expect(
        client.unassignWorkitemFromPortfolioElement(elementIdA, taskId, workspace)
      ).resolves.toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('falls back to a fresh GET when the assign endpoint returns an empty body', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolio-elements/${elementIdA}/workitems/${taskId}`)
        .reply(200);
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements/${elementIdA}`)
        .reply(200, mockElementA);

      const result = await client.assignWorkitemToPortfolioElement(elementIdA, taskId, workspace);

      expect(result.id).toBe(elementIdA);
      expect(result.name).toBe('Feature X');
      expect(nock.isDone()).toBe(true);
    });

    it('listTasks should forward portfolioElementId as a query param', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems`)
        .query({ portfolioElementId: elementIdA })
        .reply(200, { items: [], fromToken: '', nextToken: '', maxItemsCount: 50 });

      const result = await client.listTasks({ workspace, portfolioElementId: elementIdA });

      expect(result.items).toHaveLength(0);
      expect(nock.isDone()).toBe(true);
    });
  });

  describe('teamstorm_portfolio_links_set', () => {
    it('assigns directly when portfolioElementId is given (skips name lookup)', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolio-elements/${elementIdA}/workitems/${taskId}`)
        .reply(200, mockElementA);

      const result = await setTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementId: elementIdA,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('закреплена');
      expect(nock.isDone()).toBe(true);
    });

    it('does not crash when the assign endpoint returns an empty body (falls back to GET)', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolio-elements/${elementIdA}/workitems/${taskId}`)
        .reply(200);
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements/${elementIdA}`)
        .reply(200, mockElementA);

      const result = await setTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementId: elementIdA,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('закреплена');
      expect(result.content[0].text).toContain('Feature X');
      expect(nock.isDone()).toBe(true);
    });

    it('resolves by name when exactly one element matches', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Feature X' })
        .reply(200, { items: [mockElementA] });
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolio-elements/${elementIdA}/workitems/${taskId}`)
        .reply(200, mockElementA);

      const result = await setTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementName: 'Feature X',
      });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('errors when the name matches zero elements', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Ghost' })
        .reply(200, { items: [] });

      const result = await setTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementName: 'Ghost',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('не найден');
    });

    it('errors when the name matches multiple elements, listing candidates', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Feature X' })
        .reply(200, { items: [mockElementA, mockElementB] });

      const result = await setTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementName: 'Feature X',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('несколько');
      expect(result.content[0].text).toContain('Portfolio A');
      expect(result.content[0].text).toContain('Portfolio B');
    });
  });

  describe('teamstorm_portfolio_links_remove', () => {
    it('unassigns directly when portfolioElementId is given (skips name lookup)', async () => {
      nock(baseUrl)
        .delete(`/workspaces/${workspace}/portfolio-elements/${elementIdA}/workitems/${taskId}`)
        .reply(204);

      const result = await removeTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementId: elementIdA,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('откреплена');
      expect(nock.isDone()).toBe(true);
    });

    it('resolves by name when exactly one element matches', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Feature X' })
        .reply(200, { items: [mockElementA] });
      nock(baseUrl)
        .delete(`/workspaces/${workspace}/portfolio-elements/${elementIdA}/workitems/${taskId}`)
        .reply(204);

      const result = await removeTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementName: 'Feature X',
      });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('errors when the name matches zero elements', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Ghost' })
        .reply(200, { items: [] });

      const result = await removeTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementName: 'Ghost',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('не найден');
    });

    it('errors when the name matches multiple elements, listing candidates', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Feature X' })
        .reply(200, { items: [mockElementA, mockElementB] });

      const result = await removeTaskPortfolioElement(client, {
        workspace,
        taskId,
        portfolioElementName: 'Feature X',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('несколько');
    });
  });

  describe('teamstorm_portfolio_links_list_tasks_by_name', () => {
    it('returns tasks for a single matched element', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Feature X' })
        .reply(200, { items: [mockElementA] });
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems`)
        .query({ portfolioElementId: elementIdA, maxItemsCount: '50' })
        .reply(200, {
          items: [{ id: 't1', key: 'TS-1', name: 'Ship the feature', status: { name: 'In Progress' } }],
          fromToken: '',
          nextToken: '',
          maxItemsCount: 50,
        });

      const result = await getTasksByPortfolioElementName(client, {
        workspace,
        portfolioElementName: 'Feature X',
        maxItemsCount: 50,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Feature X');
      expect(result.content[0].text).toContain('TS-1: Ship the feature');
      expect((result.structuredContent as { count: number }).count).toBe(1);
      expect(nock.isDone()).toBe(true);
    });

    it('groups tasks by each matched element when the name is ambiguous', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Feature X' })
        .reply(200, { items: [mockElementA, mockElementB] });
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems`)
        .query({ portfolioElementId: elementIdA, maxItemsCount: '50' })
        .reply(200, {
          items: [{ id: 't1', key: 'TS-1', name: 'Task A', status: { name: 'Open' } }],
          fromToken: '',
          nextToken: '',
          maxItemsCount: 50,
        });
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems`)
        .query({ portfolioElementId: elementIdB, maxItemsCount: '50' })
        .reply(200, {
          items: [{ id: 't2', key: 'TS-2', name: 'Task B', status: { name: 'Open' } }],
          fromToken: '',
          nextToken: '',
          maxItemsCount: 50,
        });

      const result = await getTasksByPortfolioElementName(client, {
        workspace,
        portfolioElementName: 'Feature X',
        maxItemsCount: 50,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Portfolio A');
      expect(result.content[0].text).toContain('Portfolio B');
      expect(result.content[0].text).toContain('TS-1: Task A');
      expect(result.content[0].text).toContain('TS-2: Task B');
      expect((result.structuredContent as { count: number }).count).toBe(2);
      expect(nock.isDone()).toBe(true);
    });

    it('returns a friendly (non-error) message when zero elements match', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ name: 'Ghost' })
        .reply(200, { items: [] });

      const result = await getTasksByPortfolioElementName(client, {
        workspace,
        portfolioElementName: 'Ghost',
        maxItemsCount: 50,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('не найдены');
      expect((result.structuredContent as { count: number }).count).toBe(0);
    });
  });
});
