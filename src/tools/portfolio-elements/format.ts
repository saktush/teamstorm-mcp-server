import type { TeamStormPortfolioElementModel } from '../../client/types.js';

/**
 * Форматирует PortfolioElementModel в человекочитаемый Markdown-блок.
 * Используется инструментами создания/изменения/получения элементов портфеля.
 */
export function formatPortfolioElementModel(element: TeamStormPortfolioElementModel): string {
  const lines: string[] = [];
  lines.push(`# Элемент портфеля: ${element.name}\n`);
  lines.push(`- **ID:** \`${element.id}\``);
  if (element.portfolio) {
    lines.push(`- **Портфель:** ${element.portfolio.name} (\`${element.portfolio.id}\`)`);
  }
  if (element.status) {
    lines.push(`- **Статус:** ${element.status.name}`);
  }
  if (element.description) lines.push(`- **Описание:** ${element.description}`);
  if (element.startDate) lines.push(`- **Дата начала:** ${element.startDate}`);
  if (element.endDate) lines.push(`- **Дата окончания:** ${element.endDate}`);

  if (element.responsibles && element.responsibles.length > 0) {
    const responsiblesText = element.responsibles
      .map((u) => `${u.displayName} (${u.username})`)
      .join(', ');
    lines.push(`- **Ответственные:** ${responsiblesText}`);
  }

  return lines.join('\n');
}
