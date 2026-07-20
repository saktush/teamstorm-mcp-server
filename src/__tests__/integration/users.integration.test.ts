import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { getUser } from '../../tools/users/get.js';
import { listAllUsers } from '../../tools/users/list-all.js';

const mockUser = {
  id: 'u0000000-0000-0000-0000-000000000001',
  displayName: 'Jane Doe',
  username: 'jane.doe',
  email: 'jane.doe@example.com',
};

describe('TeamStormClient Global Users Integration Tests', () => {
  let client: TeamStormClient;
  const baseUrl = 'http://teamstorm.test';
  const token = 'test-token';

  beforeEach(() => {
    nock.cleanAll();
    client = new TeamStormClient(token, baseUrl);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('getUser', () => {
    it('fetches a global user by id, without any workspace in the path', async () => {
      nock(baseUrl).get(`/users/${mockUser.id}`).reply(200, mockUser);

      const result = await client.getUser(mockUser.id);

      expect(result).toEqual(mockUser);
      expect(nock.isDone()).toBe(true);
    });

    it('passes providerId as a query parameter when given', async () => {
      const providerId = 'p0000000-0000-0000-0000-000000000009';
      nock(baseUrl)
        .get(`/users/${mockUser.id}`)
        .query({ providerId })
        .reply(200, mockUser);

      const result = await client.getUser(mockUser.id, providerId);

      expect(result).toEqual(mockUser);
      expect(nock.isDone()).toBe(true);
    });

    it('throws a descriptive error on 404', async () => {
      nock(baseUrl)
        .get('/users/missing')
        .reply(404, { message: 'User not found' });

      await expect(client.getUser('missing')).rejects.toThrow(/User not found/);
    });
  });

  describe('listAllUsers', () => {
    it('lists all users instance-wide with no params', async () => {
      nock(baseUrl).get('/users').reply(200, { items: [mockUser] });

      const result = await client.listAllUsers();

      expect(result.items).toEqual([mockUser]);
      expect(nock.isDone()).toBe(true);
    });

    it('passes filters through as query params, server-side (not client-filtered)', async () => {
      nock(baseUrl)
        .get('/users')
        .query({ email: 'jane.doe@example.com' })
        .reply(200, { items: [mockUser] });

      const result = await client.listAllUsers({ email: 'jane.doe@example.com' });

      expect(result.items).toEqual([mockUser]);
      expect(nock.isDone()).toBe(true);
    });
  });

  describe('teamstorm_get_user tool', () => {
    it('returns the user as structuredContent', async () => {
      nock(baseUrl).get(`/users/${mockUser.id}`).reply(200, mockUser);

      const result = await getUser(client, { user: mockUser.id });

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent).toEqual(mockUser);
      expect(nock.isDone()).toBe(true);
    });

    it('returns isError on a 404', async () => {
      nock(baseUrl).get('/users/missing').reply(404, { message: 'User not found' });

      const result = await getUser(client, { user: 'missing' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('User not found');
    });
  });

  describe('teamstorm_list_all_users tool', () => {
    it('lists users and reports the total in structuredContent', async () => {
      nock(baseUrl).get('/users').reply(200, { items: [mockUser] });

      const result = await listAllUsers(client, {});

      expect(result.isError).toBeUndefined();
      expect(result.structuredContent?.total).toBe(1);
      expect(nock.isDone()).toBe(true);
    });

    it('passes filters through untouched (no client-side re-filtering)', async () => {
      nock(baseUrl).get('/users').query({ username: 'jane.doe' }).reply(200, { items: [mockUser] });

      const result = await listAllUsers(client, { username: 'jane.doe' });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('returns isError on API failure', async () => {
      nock(baseUrl).get('/users').reply(403, { message: 'Forbidden' });

      const result = await listAllUsers(client, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Forbidden');
    });
  });
});
