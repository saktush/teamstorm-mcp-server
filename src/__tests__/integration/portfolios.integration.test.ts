import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { TeamStormClient } from '../../client/teamstorm.js';
import { listPortfolios } from '../../tools/portfolios/list.js';
import { getPortfolio } from '../../tools/portfolios/get.js';
import { createPortfolio } from '../../tools/portfolios/create.js';
import { updatePortfolio } from '../../tools/portfolios/update.js';
import { listPortfolioElements } from '../../tools/portfolio-elements/list.js';
import { getPortfolioElement } from '../../tools/portfolio-elements/get.js';
import { createPortfolioElement } from '../../tools/portfolio-elements/create.js';
import { updatePortfolioElement } from '../../tools/portfolio-elements/update.js';

const portfolioId = 'c0000000-0000-0000-0000-000000000001';
const folderId = 'd0000000-0000-0000-0000-000000000001';
const elementId = 'e0000000-0000-0000-0000-000000000001';
const statusId = 'f0000000-0000-0000-0000-000000000001';
const userId = 'a1000000-0000-0000-0000-000000000001';

const mockPortfolio = {
  id: portfolioId,
  name: 'Q1 Roadmap',
  description: null,
  folder: { id: folderId, name: 'Product' },
  elements: [{ id: elementId, name: 'Feature A' }],
  workflow: null,
};

const mockPortfolioElement = {
  id: elementId,
  name: 'Feature A',
  description: null,
  startDate: null,
  endDate: null,
  status: { id: statusId, name: 'In Progress', category: { id: 'cat1', name: 'InProgress' } },
  responsibles: [
    { id: userId, displayName: 'Alice', username: 'alice', email: 'alice@example.com' },
  ],
  portfolio: { id: portfolioId, name: 'Q1 Roadmap' },
};

describe('TeamStormClient Portfolios/PortfolioElements Integration Tests', () => {
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

  describe('listPortfolios', () => {
    it('should list portfolios filtered by name', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolios`)
        .query({ name: 'Q1' })
        .reply(200, { items: [mockPortfolio] });

      const result = await client.listPortfolios({ workspace, name: 'Q1' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Q1 Roadmap');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on API error', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolios`)
        .query(true)
        .reply(500, { code: 'InternalError', message: 'Boom' });

      const result = await listPortfolios(client, { workspace });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при получении списка портфелей');
    });
  });

  describe('getPortfolio', () => {
    it('should get a portfolio by id', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolios/${portfolioId}`)
        .reply(200, mockPortfolio);

      const result = await client.getPortfolio(portfolioId, workspace);

      expect(result.id).toBe(portfolioId);
      expect(result.folder.name).toBe('Product');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on 404', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolios/missing`)
        .reply(404, { code: 'NotFound', message: 'Portfolio not found' });

      const result = await getPortfolio(client, { workspace, portfolioId: 'missing' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при получении портфеля');
    });
  });

  describe('createPortfolio', () => {
    it('should create a portfolio', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolios`, { name: 'Q1 Roadmap', folderId })
        .reply(200, mockPortfolio);

      const result = await client.createPortfolio({ name: 'Q1 Roadmap', folderId }, workspace);

      expect(result.name).toBe('Q1 Roadmap');
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace into the request body', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolios`, { name: 'Q1 Roadmap', folderId })
        .reply(200, mockPortfolio);

      const result = await createPortfolio(client, { workspace, name: 'Q1 Roadmap', folderId });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Портфель создан');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on API error', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolios`)
        .reply(403, { code: 'Forbidden', message: 'Access denied' });

      const result = await createPortfolio(client, { workspace, name: 'Denied', folderId });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при создании портфеля');
    });
  });

  describe('patchPortfolio', () => {
    it('should rename a portfolio', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/portfolios/${portfolioId}`, { name: 'Renamed' })
        .reply(200, { ...mockPortfolio, name: 'Renamed' });

      const result = await client.patchPortfolio(portfolioId, { name: 'Renamed' }, workspace);

      expect(result.name).toBe('Renamed');
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace/portfolioId into the request body', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/portfolios/${portfolioId}`, { name: 'Clean body' })
        .reply(200, { ...mockPortfolio, name: 'Clean body' });

      const result = await updatePortfolio(client, {
        workspace,
        portfolioId,
        name: 'Clean body',
      });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on 404', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/portfolios/missing`)
        .reply(404, { code: 'NotFound', message: 'Portfolio not found' });

      const result = await updatePortfolio(client, {
        workspace,
        portfolioId: 'missing',
        name: 'Ghost',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при обновлении портфеля');
    });
  });

  describe('listPortfolioElements', () => {
    it('should list portfolio elements filtered by portfolioId', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query({ portfolioId })
        .reply(200, { items: [mockPortfolioElement] });

      const result = await client.listPortfolioElements({ workspace, portfolioId });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Feature A');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on API error', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements`)
        .query(true)
        .reply(500, { code: 'InternalError', message: 'Boom' });

      const result = await listPortfolioElements(client, { workspace });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при получении списка элементов портфеля');
    });
  });

  describe('getPortfolioElement', () => {
    it('should get a portfolio element by id', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements/${elementId}`)
        .reply(200, mockPortfolioElement);

      const result = await client.getPortfolioElement(elementId, workspace);

      expect(result.id).toBe(elementId);
      expect(result.portfolio.name).toBe('Q1 Roadmap');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on 404', async () => {
      nock(baseUrl)
        .get(`/workspaces/${workspace}/portfolio-elements/missing`)
        .reply(404, { code: 'NotFound', message: 'Portfolio element not found' });

      const result = await getPortfolioElement(client, {
        workspace,
        portfolioElementId: 'missing',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при получении элемента портфеля');
    });
  });

  describe('createPortfolioElement', () => {
    it('should create a portfolio element', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolio-elements`, {
          portfolioId,
          name: 'Feature A',
        })
        .reply(200, mockPortfolioElement);

      const result = await client.createPortfolioElement({ portfolioId, name: 'Feature A' }, workspace);

      expect(result.name).toBe('Feature A');
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace into the request body', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolio-elements`, {
          portfolioId,
          name: 'Feature A',
        })
        .reply(200, mockPortfolioElement);

      const result = await createPortfolioElement(client, {
        workspace,
        portfolioId,
        name: 'Feature A',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Элемент портфеля создан');
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on API error', async () => {
      nock(baseUrl)
        .post(`/workspaces/${workspace}/portfolio-elements`)
        .reply(403, { code: 'Forbidden', message: 'Access denied' });

      const result = await createPortfolioElement(client, {
        workspace,
        portfolioId,
        name: 'Denied',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при создании элемента портфеля');
    });
  });

  describe('patchPortfolioElement', () => {
    it('should update status and responsibles', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/portfolio-elements/${elementId}`, {
          status: 'Done',
          responsibles: [userId],
        })
        .reply(200, {
          ...mockPortfolioElement,
          status: { id: statusId, name: 'Done', category: { id: 'cat2', name: 'Done' } },
        });

      const result = await client.patchPortfolioElement(
        elementId,
        { status: 'Done', responsibles: [userId] },
        workspace
      );

      expect(result.status.name).toBe('Done');
      expect(nock.isDone()).toBe(true);
    });

    it('tool must not leak apiUrl/workspace/portfolioElementId into the request body', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/portfolio-elements/${elementId}`, { name: 'Clean body' })
        .reply(200, { ...mockPortfolioElement, name: 'Clean body' });

      const result = await updatePortfolioElement(client, {
        workspace,
        portfolioElementId: elementId,
        name: 'Clean body',
      });

      expect(result.isError).toBeUndefined();
      expect(nock.isDone()).toBe(true);
    });

    it('tool should return isError on 404', async () => {
      nock(baseUrl)
        .patch(`/workspaces/${workspace}/portfolio-elements/missing`)
        .reply(404, { code: 'NotFound', message: 'Portfolio element not found' });

      const result = await updatePortfolioElement(client, {
        workspace,
        portfolioElementId: 'missing',
        name: 'Ghost',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Ошибка при обновлении элемента портфеля');
    });
  });
});
