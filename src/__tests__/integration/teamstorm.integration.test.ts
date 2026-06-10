import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { logger } from '../../utils/logger.js';

describe('TeamStormClient Integration Tests', () => {
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

  describe('listTasks', () => {
    it('should fetch tasks list successfully', async () => {
      const mockResponse = {
        fromToken: '',
        maxItemsCount: 50,
        nextToken: 'next-page-token',
        items: [
          {
            id: '1',
            key: 'TS-1',
            name: 'Test Task',
            description: 'Description',
            type: { id: '1', name: 'Task' },
            workflow: { id: '1', name: 'Default' },
            status: { id: '1', name: 'Open', category: { id: '1', name: 'Todo' } },
            createdDate: '2024-01-01T00:00:00Z',
            originalEstimate: 3600,
            timeSpent: 0,
            remainingEstimate: 3600,
            storyPoints: 5,
            author: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
            changedBy: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
            attributes: [],
            portfolios: [],
            workspace: {
              id: '1',
              key: workspace,
              name: 'Test',
              description: '',
              author: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
            },
          },
        ],
      };

      nock(baseUrl).get(`/workspaces/${workspace}/workitems`).reply(200, mockResponse);

      const result = await client.listTasks({ workspace });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].key).toBe('TS-1');
      expect(result.nextToken).toBe('next-page-token');
    });

    it('should pass query parameters', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems`)
        .query({
          maxItemsCount: '10',
          status: 'Open',
        })
        .reply(200, { fromToken: '', maxItemsCount: 10, nextToken: '', items: [] });

      await client.listTasks({ workspace, maxItemsCount: 10, status: 'Open' });

      expect(nock.isDone()).toBe(true);
    });
  });

  describe('getTask', () => {
    it('should fetch single task by ID', async () => {
      const mockTask = {
        id: '123',
        key: 'TS-123',
        name: 'Test Task',
        description: 'Description',
        type: { id: '1', name: 'Task' },
        workflow: { id: '1', name: 'Default' },
        status: { id: '1', name: 'Open', category: { id: '1', name: 'Todo' } },
        createdDate: '2024-01-01T00:00:00Z',
        originalEstimate: 3600,
        timeSpent: 0,
        remainingEstimate: 3600,
        storyPoints: 5,
        author: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        changedBy: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        attributes: [],
        portfolios: [],
        workspace: {
          id: '1',
          key: workspace,
          name: 'Test',
          description: '',
          author: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        },
      };

      nock(baseUrl).get(`/workspaces/${workspace}/workitems/TS-123`).reply(200, mockTask);

      const result = await client.getTask('TS-123', workspace);

      expect(result.key).toBe('TS-123');
      expect(result.name).toBe('Test Task');
    });

    it('should handle 404 for non-existent task', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/TS-999`)
        .reply(404, { message: 'Task not found' });

      await expect(client.getTask('TS-999', workspace)).rejects.toThrow('404');
    });
  });

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const newTask = {
        id: '456',
        key: 'TS-456',
        name: 'New Task',
        description: 'New Description',
        type: { id: '1', name: 'Task' },
        workflow: { id: '1', name: 'Default' },
        status: { id: '1', name: 'Open', category: { id: '1', name: 'Todo' } },
        createdDate: '2024-01-01T00:00:00Z',
        originalEstimate: 3600,
        timeSpent: 0,
        remainingEstimate: 3600,
        storyPoints: 3,
        author: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        changedBy: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        attributes: [],
        portfolios: [],
        workspace: {
          id: '1',
          key: workspace,
          name: 'Test',
          description: '',
          author: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        },
      };

      nock(baseUrl).post(`/workspaces/${workspace}/workitems`).reply(201, newTask);

      const result = await client.createTask({
        name: 'New Task',
        type: 'Task',
        workspace,
      });

      expect(result.key).toBe('TS-456');
      expect(result.name).toBe('New Task');
    });
  });

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updatedTask = {
        id: '123',
        key: 'TS-123',
        name: 'Updated Task',
        description: 'Updated Description',
        type: { id: '1', name: 'Task' },
        workflow: { id: '1', name: 'Default' },
        status: { id: '2', name: 'In Progress', category: { id: '2', name: 'In Progress' } },
        createdDate: '2024-01-01T00:00:00Z',
        originalEstimate: 3600,
        timeSpent: 1800,
        remainingEstimate: 1800,
        storyPoints: 5,
        author: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        changedBy: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        attributes: [],
        portfolios: [],
        workspace: {
          id: '1',
          key: workspace,
          name: 'Test',
          description: '',
          author: { id: '1', displayName: 'User', username: 'user', email: 'user@test.com' },
        },
      };

      nock(baseUrl).patch(`/workspaces/${workspace}/workitems/TS-123`).reply(200, updatedTask);

      const result = await client.updateTask('TS-123', {
        status: 'In Progress',
        workspace,
      });

      expect(result.status.name).toBe('In Progress');
    });
  });

  describe('getTaskCount', () => {
    it('should fetch task count', async () => {
      nock(baseUrl).get(`/workspaces/${workspace}/workitems/count`).reply(200, { count: 42 });

      const count = await client.getTaskCount(workspace);

      expect(count).toBe(42);
    });
  });

  describe('rate limiting', () => {
    it('should log warning when approaching rate limit', async () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      nock(baseUrl).get(`/workspaces/${workspace}/workitems`).reply(
        200,
        { fromToken: '', maxItemsCount: 50, nextToken: '', items: [] },
        {
          'x-ratelimit-limit': '100',
          'x-ratelimit-remaining': '5',
          'x-ratelimit-reset': '1234567890',
        }
      );

      await client.listTasks({ workspace });

      expect(warnSpy).toHaveBeenCalledWith(
        expect.objectContaining({ remaining: 5, limit: 100, percentage: '5.0' }),
        'Rate limit critical'
      );

      warnSpy.mockRestore();
    });
  });

  describe('setBaseUrl normalization', () => {
    it('should accept URL without /cwm/public/api/v1 suffix and normalize it', () => {
      const normalizedClient = new TeamStormClient(token, baseUrl, workspace);
      normalizedClient.setBaseUrl('http://teamstorm.test');

      expect(normalizedClient.hasBaseUrl()).toBe(true);
    });

    it('should normalize URL with trailing slash', () => {
      const normalizedClient = new TeamStormClient(token, baseUrl, workspace);
      normalizedClient.setBaseUrl('http://teamstorm.test/');

      expect(normalizedClient.hasBaseUrl()).toBe(true);
    });

    it('should keep already correct URL unchanged', () => {
      const normalizedClient = new TeamStormClient(token, baseUrl, workspace);
      normalizedClient.setBaseUrl('http://teamstorm.test/cwm/public/api/v1');

      expect(normalizedClient.hasBaseUrl()).toBe(true);
    });
  });
});
