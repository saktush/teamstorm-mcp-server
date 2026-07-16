import { TeamStormClient } from '../../client/teamstorm.js';

/**
 * Резолвит UUID элемента портфеля по id (если передан напрямую) или по названию
 * (поиск через listPortfolioElements, с приоритетом точного совпадения по имени).
 * Бросает Error с понятным сообщением, если элемент не найден или найдено несколько
 * кандидатов и требуется уточнение через portfolioId/folderId.
 */
export async function resolvePortfolioElementId(
  client: TeamStormClient,
  params: {
    workspace?: string;
    portfolioElementId?: string;
    portfolioElementName?: string;
    portfolioId?: string;
    folderId?: string;
  }
): Promise<string> {
  if (params.portfolioElementId) {
    return params.portfolioElementId;
  }

  const name = params.portfolioElementName;
  if (!name) {
    throw new Error('Укажите portfolioElementId или portfolioElementName.');
  }

  const result = await client.listPortfolioElements({
    workspace: params.workspace,
    name,
    portfolioId: params.portfolioId,
    folderId: params.folderId,
  });

  const exactMatches = result.items.filter((e) => e.name === name);
  const matches = exactMatches.length > 0 ? exactMatches : result.items;

  if (matches.length === 0) {
    throw new Error(`Элемент портфеля с названием «${name}» не найден.`);
  }

  if (matches.length > 1) {
    const candidates = matches
      .map((e) => `  - ${e.name} (\`${e.id}\`) — портфель: ${e.portfolio.name}`)
      .join('\n');
    throw new Error(
      `Найдено несколько элементов портфеля с названием «${name}». ` +
        `Уточните поиск через portfolioId/folderId или укажите portfolioElementId напрямую:\n${candidates}`
    );
  }

  return matches[0].id;
}
