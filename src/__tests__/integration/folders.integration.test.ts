import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { createFolder } from '../../tools/folders/create.js';
import { updateFolder } from '../../tools/folders/update.js';

const mockFolder = {
  id: 'f0000000-0000-0000-0000-000000000001',
  name: 'Test Folder',
  description: 'Folder description',
  parentId: null,
};

describe('TeamStormClient Folders Integration Tests', () => {
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

  describe('createFolder', () => {
    it('should create a folder with all fields', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/folders`, {
          name: 'Test Folder',
          description: 'Folder description',
          parentId: 'f0000000-0000-0000-0000-000000000009',
        })
        .reply(200, {
          ...mockFolder,
          parentId: 'f0000000-0000-0000-0000-000000000009',
        });

      const result = await client.createFolder(
        {
          name: 'Test Folder',
          description: 'Folder description',
          parentId: 'f0000000-0000-0000-0000-000000000009',
        },
        workspace
      );

      expect(result.name).toBe('Test Folder');
      expect(result.parentId).toBe('f0000000-0000-0000-0000-000000000009');
      expect(nock.isDone()).toBe(true);
    });

    it('should create a folder with name only', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/folders`, { name: 'Root Folder' })
        .reply(200, { ...mockFolder, name: 'Root Folder', description: null });

      const result = await client.createFolder({ name: 'Root Folder' }, workspace);

      expect(result.name).toBe('Root Folder');
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace into the request body', async () => {
      // nock body matcher: exact match fails if extra keys are present
      nock(baseUrl)
        .post(`/workspaces/${workspace}/folders`, { name: 'Clean body' })
        .reply(200, { ...mockFolder, name: 'Clean body' });

      const result = await createFolder(client, { workspace, name: 'Clean body' });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on API error', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/folders`)
        .reply(403, { code: 'Forbidden', message: 'Access denied' });

      const result = await createFolder(client, { workspace, name: 'Denied' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при создании папки');
    });
  });

  describe('patchFolder', () => {
    it('should rename a folder', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/folders/${mockFolder.id}`, { name: 'Renamed' })
        .reply(200, { ...mockFolder, name: 'Renamed' });

      const result = await client.patchFolder(mockFolder.id, { name: 'Renamed' }, workspace);

      expect(result.name).toBe('Renamed');
      expect(nock.isDone()).toBe(true);
    });

    it('should move a folder to another parent', async () => {
      const newParent = 'f0000000-0000-0000-0000-000000000042';
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/folders/${mockFolder.id}`, { parentId: newParent })
        .reply(200, { ...mockFolder, parentId: newParent });

      const result = await client.patchFolder(mockFolder.id, { parentId: newParent }, workspace);

      expect(result.parentId).toBe(newParent);
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace/folderId into the request body', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/folders/${mockFolder.id}`, { name: 'Clean body' })
        .reply(200, { ...mockFolder, name: 'Clean body' });

      const result = await updateFolder(client, {
        workspace,
        folderId: mockFolder.id,
        name: 'Clean body',
      });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on 404', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/folders/missing`)
        .reply(404, { code: 'NotFound', message: 'Folder not found' });

      const result = await updateFolder(client, {
        workspace,
        folderId: 'missing',
        name: 'Ghost',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при обновлении папки');
    });
  });
});
