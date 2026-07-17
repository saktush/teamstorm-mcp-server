import { TeamStormClient } from '../../client/teamstorm.js';

/**
 * Резолвит UUID Agile-борда по agileId (если передан напрямую) или по folderId
 * (поиск через listAgile, отфильтрованный по папке на бэкенде). Бросает Error
 * с понятным сообщением, если у папки ещё нет Agile-борда — не создаёт его
 * автоматически, так как это отдельное, явно запрашиваемое действие
 * (teamstorm_create_agile_board).
 */
export async function resolveAgileId(
  client: TeamStormClient,
  params: {
    workspace?: string;
    folderId?: string;
    agileId?: string;
  }
): Promise<string> {
  if (params.agileId) {
    return params.agileId;
  }

  if (!params.folderId) {
    throw new Error('Укажите folderId или agileId.');
  }

  const boards = await client.listAgile(params.workspace, params.folderId);

  if (boards.length === 0) {
    throw new Error(
      `У папки ${params.folderId} нет Agile-борда. Создайте его через teamstorm_create_agile_board, ` +
        `затем повторите создание спринта.`
    );
  }

  if (boards.length > 1) {
    const candidates = boards.map((b) => `  - ${b.name} (\`${b.id}\`)`).join('\n');
    throw new Error(
      `У папки ${params.folderId} найдено несколько Agile-бордов. Укажите agileId напрямую:\n${candidates}`
    );
  }

  return boards[0].id;
}
