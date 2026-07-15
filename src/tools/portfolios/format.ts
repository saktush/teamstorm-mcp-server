import type { TeamStormPortfolioModel } from '../../client/types.js';

/**
 * Форматирует PortfolioModel в человекочитаемый Markdown-блок.
 * Используется инструментами создания/изменения/получения портфелей.
 */
export function formatPortfolioModel(portfolio: TeamStormPortfolioModel): string {
  const lines: string[] = [];
  lines.push(`# Портфель: ${portfolio.name}\n`);
  lines.push(`- **ID:** \`${portfolio.id}\``);
  lines.push(`- **Папка:** ${portfolio.folder.name} (\`${portfolio.folder.id}\`)`);
  if (portfolio.description) lines.push(`- **Описание:** ${portfolio.description}`);
  if (portfolio.workflow) {
    lines.push(`- **Workflow:** ${portfolio.workflow.name} (\`${portfolio.workflow.id}\`)`);
  }

  if (portfolio.elements.length > 0) {
    const elementsText = portfolio.elements.map((e) => `  - ${e.name} (\`${e.id}\`)`).join('\n');
    lines.push(`- **Элементы портфеля (${portfolio.elements.length}):**\n${elementsText}`);
  } else {
    lines.push(`- **Элементы портфеля:** нет`);
  }

  return lines.join('\n');
}
