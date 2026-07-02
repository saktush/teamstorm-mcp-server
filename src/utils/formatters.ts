import type {
  TeamStormTask,
  TeamStormTaskListResponse,
  TeamStormDocument,
} from '../client/types.js';

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
      const dueDate = new Date(task.dueDate);
      lines.push(`**Срок**: ${dueDate.toLocaleDateString('ru-RU')}`);
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
  }

  if (task.folder) {
    lines.push(`**Папка**: ${task.folder.name}`);
  }

  lines.push('');
  lines.push(`**Создана**: ${new Date(task.createdDate).toLocaleString('ru-RU')}`);

  if (task.startDate) {
    lines.push(`**Начало**: ${new Date(task.startDate).toLocaleString('ru-RU')}`);
  }

  if (task.dueDate) {
    lines.push(`**Срок**: ${new Date(task.dueDate).toLocaleString('ru-RU')}`);
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
      let value: string;
      switch (attr.type) {
        case 'User': {
          const userValue = attr.value as TeamStormTask['assignee'] | undefined;
          value = userValue?.displayName || 'Не заполнено';
          break;
        }
        case 'Tag':
          value = Array.isArray(attr.value) ? attr.value.join(', ') : 'Не заполнено';
          break;
        case 'Date':
          value = attr.value
            ? new Date(attr.value as string).toLocaleDateString('ru-RU')
            : 'Не заполнено';
          break;
        default:
          value = String(attr.value ?? 'Не заполнено');
      }
      lines.push(`- **${attr.name}**: ${value}`);
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
  lines.push(`- Создан: ${new Date(doc.createdAt).toLocaleString('ru-RU')}`);

  if (doc.updatedBy) {
    lines.push(
      `- Обновлён: ${new Date(doc.updatedAt).toLocaleString('ru-RU')} (${doc.updatedBy.displayName})`
    );
  }

  if (doc.parent) {
    lines.push(`- Родитель: ${doc.parent.name} (\`${doc.parent.id}\`)`);
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

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}ч ${minutes}м`;
  if (hours > 0) return `${hours}ч`;
  return `${minutes}м`;
}
