import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { createDocument } from '../../tools/documents/create.js';
import { linkDocumentToTask } from '../../tools/document-links/create.js';

const mockUser = { id: 'u1', displayName: 'User', username: 'user', email: 'user@test.com' };

const mockDocument = {
  workspaceId: 'ws-1',
  id: 'doc-1',
  key: 'DOC-1',
  name: 'Test Document',
  documentUrl: 'http://teamstorm.test/documents/doc-1',
  content: '<p>Hello</p>',
  createdAt: '2024-01-01T00:00:00Z',
  author: mockUser,
  updatedAt: '2024-01-02T00:00:00Z',
  updatedBy: mockUser,
  parent: null,
  version: 1,
  versionUrl: 'http://teamstorm.test/documents/doc-1/versions/1',
  labels: ['spec'],
  isBlocked: false,
  status: { id: 'st-1', name: 'Draft' },
};

describe('TeamStormClient Documents Integration Tests', () => {
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

  describe('listDocuments', () => {
    it('should fetch documents list successfully', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents`)
        .reply(200, { fromToken: '', maxItemsCount: 50, nextToken: '', items: [mockDocument] });

      const result = await client.listDocuments({ workspace });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].key).toBe('DOC-1');
      expect(result.items[0].status?.name).toBe('Draft');
    });

    it('should pass pagination parameters', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents`)
        .query({ fromToken: 'page-2', maxItemsCount: '10' })
        .reply(200, { fromToken: 'page-2', maxItemsCount: 10, nextToken: 'page-3', items: [] });

      const result = await client.listDocuments({
        workspace,
        fromToken: 'page-2',
        maxItemsCount: 10,
      });

      expect(result.nextToken).toBe('page-3');
      expect(nock.isDone()).toBe(true);
    });
  });

  describe('getDocument', () => {
    it('should fetch a document by id', async () => {
      nock(baseUrl).get(`/workspaces/${workspace}/documents/doc-1`).reply(200, mockDocument);

      const result = await client.getDocument('doc-1', workspace);

      expect(result.id).toBe('doc-1');
      expect(result.content).toBe('<p>Hello</p>');
    });

    it('should throw a readable error on 404', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/missing`)
        .reply(404, { code: 'NotFound', message: 'Document not found' });

      await expect(client.getDocument('missing', workspace)).rejects.toThrow();
    });
  });

  describe('createDocument', () => {
    it('should create a document', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/documents`, {
          name: 'Test Document',
          content: '<p>Hello</p>',
          labels: ['spec'],
        })
        .reply(200, mockDocument);

      const result = await client.createDocument(
        { name: 'Test Document', content: '<p>Hello</p>', labels: ['spec'] },
        workspace
      );

      expect(result.key).toBe('DOC-1');
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace into the request body', async () => {
      // nock body matcher: exact match fails if extra keys are present
      nock(baseUrl)
        .post(`/workspaces/${workspace}/documents`, { name: 'Clean body' })
        .reply(200, mockDocument);

      const result = await createDocument(client, { workspace, name: 'Clean body' });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });
  });

  describe('patchDocument', () => {
    it('should update document status', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/documents/doc-1`, { status: 'st-2' })
        .reply(200, { ...mockDocument, status: { id: 'st-2', name: 'Approved' } });

      const result = await client.patchDocument('doc-1', { status: 'st-2' }, workspace);

      expect(result.status?.name).toBe('Approved');
    });
  });

  describe('blockDocument / unblockDocument', () => {
    it('should block a document', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/documents/doc-1/block`)
        .reply(200, { ...mockDocument, isBlocked: true });

      const result = await client.blockDocument('doc-1', workspace);

      expect(result.isBlocked).toBe(true);
    });

    it('should unblock a document', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/documents/doc-1/unblock`)
        .reply(200, { ...mockDocument, isBlocked: false });

      const result = await client.unblockDocument('doc-1', workspace);

      expect(result.isBlocked).toBe(false);
    });
  });

  describe('document sharing', () => {
    const mockPermission = {
      type: 'User',
      permissionId: 'perm-1',
      workspaceId: 'ws-1',
      documentId: 'doc-1',
      accessLevel: 'Read',
      userId: 'u1',
    };

    it('should list document permissions', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/doc-1/sharing`)
        .reply(200, [mockPermission]);

      const result = await client.listDocumentPermissions('doc-1', workspace);

      expect(result).toHaveLength(1);
      expect(result[0].permissionId).toBe('perm-1');
    });

    it('should create a user permission', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/documents/doc-1/sharing`, {
          type: 'User',
          accessLevel: 'Edit',
          userId: 'u1',
        })
        .reply(200, { ...mockPermission, accessLevel: 'Edit' });

      const result = await client.createDocumentPermission(
        'doc-1',
        { type: 'User', accessLevel: 'Edit', userId: 'u1' },
        workspace
      );

      expect(result.accessLevel).toBe('Edit');
      expect(nock.isDone()).toBe(true);
    });

    it('should patch a permission access level', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/documents/doc-1/sharing/perm-1`, {
          accessLevel: 'Comment',
        })
        .reply(200, { ...mockPermission, accessLevel: 'Comment' });

      const result = await client.patchDocumentPermission(
        'doc-1',
        'perm-1',
        { accessLevel: 'Comment' },
        workspace
      );

      expect(result.accessLevel).toBe('Comment');
    });
  });

  describe('document statuses', () => {
    it('should list document statuses', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents-statuses`)
        .reply(200, {
          items: [
            { id: 'st-1', name: 'Draft' },
            { id: 'st-2', name: 'Approved' },
          ],
        });

      const result = await client.listDocumentStatuses(workspace);

      expect(result.items).toHaveLength(2);
      expect(result.items[1].name).toBe('Approved');
    });

    it('should get a document status by id', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents-statuses/st-1`)
        .reply(200, { id: 'st-1', name: 'Draft' });

      const result = await client.getDocumentStatus('st-1', workspace);

      expect(result.name).toBe('Draft');
    });
  });

  describe('document links', () => {
    it('should list workitems linked to a document', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/doc-1/workitem-links`)
        .reply(200, [
          {
            id: 't1',
            key: 'TS-1',
            name: 'Linked Task',
            status: { id: '1', name: 'Open', category: { id: '1', name: 'Todo' } },
          },
        ]);

      const result = await client.getDocumentWorkitemLinks('doc-1', workspace);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('TS-1');
    });

    it('should create a document-workitem link (204 No Content)', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/documents/doc-1/workitem-links`, {
          workitemWorkspace: workspace,
          workitem: 'TS-1',
        })
        .reply(204);

      await expect(
        client.createDocumentWorkitemLink(
          'doc-1',
          { workitemWorkspace: workspace, workitem: 'TS-1' },
          workspace
        )
      ).resolves.toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('tool should report success on 204 without parsing a body', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/documents/doc-1/workitem-links`, {
          workitemWorkspace: workspace,
          workitem: 'TS-1',
        })
        .reply(204);

      const result = await linkDocumentToTask(client, {
        workspace,
        documentId: 'doc-1',
        taskId: 'TS-1',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('связан');
    });

    it('should list documents linked to a workitem', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/workitems/TS-1/document-links`)
        .reply(200, [mockDocument]);

      const result = await client.getWorkitemDocumentLinks('TS-1', workspace);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('doc-1');
    });
  });

  describe('document comments', () => {
    const mockComment = {
      id: 'c1',
      text: 'Nice doc',
      author: mockUser,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    it('should list document comments', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/documents/doc-1/comments`)
        .reply(200, { items: [mockComment] });

      const result = await client.listDocumentComments('doc-1', workspace);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].text).toBe('Nice doc');
    });

    it('should create a document comment', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/documents/doc-1/comments`, { text: 'Nice doc' })
        .reply(200, mockComment);

      const result = await client.createDocumentComment('doc-1', 'Nice doc', workspace);

      expect(result.id).toBe('c1');
      expect(nock.isDone()).toBe(true);
    });
  });
});
