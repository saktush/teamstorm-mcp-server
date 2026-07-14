import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { createAttribute } from '../../tools/attributes/create.js';
import { updateAttribute } from '../../tools/attributes/update.js';
import { addAttributeOption } from '../../tools/attributes/add-option.js';
import { updateAttributeOption } from '../../tools/attributes/update-option.js';

const attributeId = 'a0000000-0000-0000-0000-000000000001';
const optionId = 'b0000000-0000-0000-0000-000000000009';

const mockAttribute = {
  id: attributeId,
  name: 'Priority',
  description: 'Task priority',
  type: 'UniSelect' as const,
  options: [{ id: optionId, name: 'High' }],
  workitemTypes: [{ id: 't0000000-0000-0000-0000-000000000001', name: 'Bug' }],
};

describe('TeamStormClient Attributes Integration Tests', () => {
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

  describe('createAttribute', () => {
    it('should create an attribute with all fields', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/attributes`, {
          name: 'Priority',
          type: 'UniSelect',
          description: 'Task priority',
          options: [{ name: 'High' }],
        })
        .reply(200, mockAttribute);

      const result = await client.createAttribute(
        {
          name: 'Priority',
          type: 'UniSelect',
          description: 'Task priority',
          options: [{ name: 'High' }],
        },
        workspace
      );

      expect(result.name).toBe('Priority');
      expect(result.type).toBe('UniSelect');
      expect(nock.isDone()).toBe(true);
    });

    it('should create an attribute with required fields only', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/attributes`, { name: 'Due', type: 'Date' })
        .reply(200, { ...mockAttribute, name: 'Due', type: 'Date', options: null });

      const result = await client.createAttribute({ name: 'Due', type: 'Date' }, workspace);

      expect(result.name).toBe('Due');
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace into the request body', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/attributes`, { name: 'Clean', type: 'UniString' })
        .reply(200, { ...mockAttribute, name: 'Clean', type: 'UniString', options: null });

      const result = await createAttribute(client, {
        workspace,
        name: 'Clean',
        type: 'UniString',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Атрибут создан');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on API error', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/attributes`)
        .reply(403, { code: 'Forbidden', message: 'Access denied' });

      const result = await createAttribute(client, {
        workspace,
        name: 'Denied',
        type: 'UniString',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при создании атрибута');
    });
  });

  describe('patchAttribute', () => {
    it('should rename an attribute', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/attributes/${attributeId}`, { name: 'Renamed' })
        .reply(200, { ...mockAttribute, name: 'Renamed' });

      const result = await client.patchAttribute(attributeId, { name: 'Renamed' }, workspace);

      expect(result.name).toBe('Renamed');
      expect(nock.isDone()).toBe(true);
    });

    it('should update the option list', async () => {
      const newOptions = [{ id: optionId, name: 'High' }, { name: 'Low' }];
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/attributes/${attributeId}`, { options: newOptions })
        .reply(200, {
          ...mockAttribute,
          options: [
            { id: optionId, name: 'High' },
            { id: 'b0000000-0000-0000-0000-000000000010', name: 'Low' },
          ],
        });

      const result = await client.patchAttribute(attributeId, { options: newOptions }, workspace);

      expect(result.options).toHaveLength(2);
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace/attributeId into the request body', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/attributes/${attributeId}`, { name: 'Clean body' })
        .reply(200, { ...mockAttribute, name: 'Clean body' });

      const result = await updateAttribute(client, {
        workspace,
        attributeId,
        name: 'Clean body',
      });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on 404', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/attributes/missing`)
        .reply(404, { code: 'NotFound', message: 'Attribute not found' });

      const result = await updateAttribute(client, {
        workspace,
        attributeId: 'missing',
        name: 'Ghost',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при обновлении атрибута');
    });
  });

  describe('addAttributeOption', () => {
    it('should add an option and return the updated attribute', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/attributes/${attributeId}/options`, { name: 'Medium' })
        .reply(200, {
          ...mockAttribute,
          options: [
            { id: optionId, name: 'High' },
            { id: 'b0000000-0000-0000-0000-000000000011', name: 'Medium' },
          ],
        });

      const result = await client.addAttributeOption(attributeId, { name: 'Medium' }, workspace);

      expect(result.options).toHaveLength(2);
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace/attributeId into the request body', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/attributes/${attributeId}/options`, { name: 'Medium' })
        .reply(200, mockAttribute);

      const result = await addAttributeOption(client, {
        workspace,
        attributeId,
        name: 'Medium',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Опция добавлена');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on API error', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/attributes/${attributeId}/options`)
        .reply(400, { code: 'BadRequest', message: 'Invalid attribute type' });

      const result = await addAttributeOption(client, {
        workspace,
        attributeId,
        name: 'Nope',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при добавлении опции');
    });
  });

  describe('patchAttributeOption', () => {
    it('should rename an option and return the updated attribute', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/attributes/${attributeId}/options`, {
          id: optionId,
          name: 'Critical',
        })
        .reply(200, { ...mockAttribute, options: [{ id: optionId, name: 'Critical' }] });

      const result = await client.patchAttributeOption(
        attributeId,
        { id: optionId, name: 'Critical' },
        workspace
      );

      expect(result.options?.[0].name).toBe('Critical');
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace/attributeId into the request body', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/attributes/${attributeId}/options`, {
          id: optionId,
          name: 'Critical',
        })
        .reply(200, { ...mockAttribute, options: [{ id: optionId, name: 'Critical' }] });

      const result = await updateAttributeOption(client, {
        workspace,
        attributeId,
        id: optionId,
        name: 'Critical',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Опция обновлена');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on 404', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/attributes/${attributeId}/options`)
        .reply(404, { code: 'NotFound', message: 'Option not found' });

      const result = await updateAttributeOption(client, {
        workspace,
        attributeId,
        id: optionId,
        name: 'Ghost',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при обновлении опции');
    });
  });
});
