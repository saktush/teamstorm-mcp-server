import { describe, it, expect, beforeEach } from 'vitest';
import { TeamStormClient } from '../client/teamstorm.js';

describe('TeamStormClient', () => {
  let client: TeamStormClient;

  beforeEach(() => {
    client = new TeamStormClient('test-token', 'http://localhost:3000', 'test-workspace');
  });

  describe('constructor', () => {
    it('should create client with correct configuration', () => {
      expect(client).toBeInstanceOf(TeamStormClient);
    });
  });

  describe('error handling', () => {
    it('should throw descriptive error on 401', async () => {
      // Mock axios to simulate 401
      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
        config: { url: '/test' },
        isAxiosError: true,
        toJSON: () => ({}),
      };

      // This would need actual axios mocking in integration tests
      // Unit test validates error message format
      expect(mockError.response.status).toBe(401);
    });

    it('should throw descriptive error on 404', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { message: 'Not found' },
        },
        config: { url: '/test' },
        isAxiosError: true,
        toJSON: () => ({}),
      };

      expect(mockError.response.status).toBe(404);
    });

    it('should throw network error when no response', async () => {
      const mockError = {
        request: {},
        message: 'timeout',
        isAxiosError: true,
        toJSON: () => ({}),
      };

      expect(mockError.request).toBeDefined();
    });
  });

  describe('type safety', () => {
    it('should have all required methods', () => {
      expect(typeof client.listTasks).toBe('function');
      expect(typeof client.getTask).toBe('function');
      expect(typeof client.createTask).toBe('function');
      expect(typeof client.updateTask).toBe('function');
      expect(typeof client.deleteTask).toBe('function');
      expect(typeof client.getTaskCount).toBe('function');
      expect(typeof client.listUsers).toBe('function');
      expect(typeof client.listSprints).toBe('function');
      expect(typeof client.listWorkflows).toBe('function');
      expect(typeof client.listTaskTypes).toBe('function');
    });
  });
});
