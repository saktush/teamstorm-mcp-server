import type {
  TeamStormTask,
  TeamStormTaskListResponse,
  TeamStormDocument,
} from '../client/types.js';
import { formatDate, formatDateTime } from './dates.js';
import { formatAttributeValue } from './attribute-format.js';

// `formatDuration` переехала в `dates.ts` (её использует `attribute-format.ts`,
// импорт из этого файла создал бы цикл). Реэкспорт — для существующих потребителей.
export { formatDuration } from './dates.js';

export function formatTaskListMarkdown(data: TeamStormTaskListResponse): string {
  const lines: string[] = [];

  lines.push(`# Список задач (${data.items.length})`);
  lines.push('');

  if (data.items.length === 0) {
    lines.push('Задачи не найдены.');
    return lines.join('\n');
  }

  for (const task of data.items) {
    lines.push(`## ${task.key}: ${task.name}`);
    lines.push('');

    const status = task.status ? `${task.status.name}` : 'Без статуса';
    const assignee = task.assignee
      ? `${task.assignee.displayName} (${task.assignee.username})`
      : 'Не назначен';

    lines.push(`**Статус**: ${status}`);
    lines.push(`**Исполнитель**: ${assignee}`);

    if (task.type) {
      lines.push(`**Тип**: ${task.type.name}`);
    }

    if (task.sprint) {
      lines.push(`**Спринт**: ${task.sprint.name}`);
    }

    if (task.dueDate) {
      lines.push(`**Срок**: ${formatDate(task.dueDate)}`);
    }

    if (task.storyPoints > 0) {
      lines.push(`**Story Points**: ${task.storyPoints}`);
    }

    lines.push('');
  }

  if (data.nextToken) {
    lines.push('---');
    lines.push(`_Есть еще задачи. Используйте fromToken: "${data.nextToken}" для продолжения_`);
  }

  return lines.join('\n');
}

export function formatTaskMarkdown(task: TeamStormTask): string {
  const lines: string[] = [];

  lines.push(`# ${task.key}: ${task.name}`);
  lines.push('');

  const status = task.status
    ? `${task.status.name} (${task.status.category?.name || 'Без категории'})`
    : 'Без статуса';
  const assignee = task.assignee
    ? `${task.assignee.displayName} (${task.assignee.username}, ${task.assignee.email})`
    : 'Не назначен';

  lines.push(`**Статус**: ${status}`);
  lines.push(`**Исполнитель**: ${assignee}`);
  lines.push(
    `**Автор**: ${task.author?.displayName ?? 'Неизвестно'} (${task.author?.username ?? '—'})`
  );

  if (task.type) {
    lines.push(`**Тип**: ${task.type.name}`);
  }

  if (task.workflow) {
    lines.push(`**Процесс**: ${task.workflow.name}`);
  }

  if (task.sprint) {
    lines.push(`**Спринт**: ${task.sprint.name}`);
    if (task.sprint.startDate && task.sprint.endDate) {
      const start = formatDate(task.sprint.startDate);
      const end = formatDate(task.sprint.endDate);
      lines.push(`**Даты спринта**: ${start} – ${end}`);
    }
    if (task.sprint.description) {
      lines.push(`**Цель спринта**: ${task.sprint.description}`);
    }
  }

  if (task.folder) {
    lines.push(`**Папка**: ${task.folder.name}`);
  }

  if (task.portfolios.length > 0) {
    const portfoliosText = task.portfolios
      .map((p) => {
        const elements = p.elements.map((e) => e.name).join(', ');
        return elements ? `${p.name} (${elements})` : p.name;
      })
      .join(', ');
    lines.push(`**Портфели**: ${portfoliosText}`);
  }

  lines.push('');
  lines.push(`**Создана**: ${formatDateTime(task.createdDate)}`);

  if (task.startDate) {
    lines.push(`**Начало**: ${formatDateTime(task.startDate)}`);
  }

  if (task.dueDate) {
    lines.push(`**Срок**: ${formatDateTime(task.dueDate)}`);
  }

  lines.push('');
  lines.push(`**Оценка**: ${task.originalEstimate} сек`);
  lines.push(`**Затрачено**: ${task.timeSpent} сек`);
  lines.push(`**Осталось**: ${task.remainingEstimate} сек`);

  if (task.storyPoints > 0) {
    lines.push(`**Story Points**: ${task.storyPoints}`);
  }

  lines.push('');
  lines.push(`**Пространство**: ${task.workspace.name} (${task.workspace.key})`);

  if (task.description) {
    lines.push('');
    lines.push('## Описание');
    lines.push('');
    lines.push(task.description);
  }

  if (task.attributes.length > 0) {
    lines.push('');
    lines.push('## Атрибуты');
    lines.push('');

    for (const attr of task.attributes) {
      lines.push(`- **${attr.name}**: ${formatAttributeValue(attr)}`);
    }
  }

  return lines.join('\n');
}

export function formatDocumentMarkdown(doc: TeamStormDocument, includeContent = false): string {
  const lines: string[] = [];

  lines.push(`# ${doc.key}: ${doc.name}`);
  lines.push('');
  lines.push(`- ID: \`${doc.id}\``);
  lines.push(`- Версия: ${doc.version}`);
  lines.push(`- Статус: ${doc.status ? doc.status.name : 'Без статуса'}`);
  lines.push(`- Заблокирован: ${doc.isBlocked ? 'да 🔒' : 'нет'}`);
  lines.push(`- Автор: ${doc.author.displayName}`);
  lines.push(`- Создан: ${formatDateTime(doc.createdAt)}`);

  if (doc.updatedBy) {
    lines.push(`- Обновлён: ${formatDateTime(doc.updatedAt)} (${doc.updatedBy.displayName})`);
  }

  if (doc.parent) {
    // `parent` резолвится в спеке к TreeNodeThumbModel {id, nodeType} — у него нет
    // `name` (в отличие от `folder` у задач). Раньше здесь стояло `doc.parent.name`,
    // которого никогда не было в ответе API, и строка печатала `undefined`.
    lines.push(`- Родитель: ${doc.parent.nodeType} (\`${doc.parent.id}\`)`);
  }

  if (doc.labels && doc.labels.length > 0) {
    lines.push(`- Метки: ${doc.labels.join(', ')}`);
  }

  if (doc.documentUrl) {
    lines.push(`- URL: ${doc.documentUrl}`);
  }

  if (includeContent && doc.content) {
    lines.push('');
    lines.push('## Содержимое');
    lines.push('');
    lines.push(doc.content);
  }

  return lines.join('\n');
}

export function formatErrorMarkdown(error: Error): string {
  return `# Ошибка\n\n${error.message}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
