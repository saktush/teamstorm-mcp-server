import type { TeamStormAttributeModel } from '../../client/types.js';

/**
 * Форматирует AttributeModel в человекочитаемый Markdown-блок.
 * Используется инструментами создания/изменения атрибутов и опций.
 */
export function formatAttributeModel(attr: TeamStormAttributeModel): string {
  const lines: string[] = [];
  lines.push(`# Атрибут: ${attr.name}\n`);
  lines.push(`- **ID:** \`${attr.id}\``);
  lines.push(`- **Тип:** ${attr.type}`);
  if (attr.description) lines.push(`- **Описание:** ${attr.description}`);

  if (attr.options && attr.options.length > 0) {
    const optionsText = attr.options.map((o) => `  - ${o.name} (\`${o.id}\`)`).join('\n');
    lines.push(`- **Опции (${attr.options.length}):**\n${optionsText}`);
  }

  if (attr.workitemTypes && attr.workitemTypes.length > 0) {
    lines.push(
      `- **Используется в типах задач:** ${attr.workitemTypes.map((t) => t.name).join(', ')}`
    );
  }

  return lines.join('\n');
}
