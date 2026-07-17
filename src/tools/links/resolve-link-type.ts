import { TeamStormClient } from '../../client/teamstorm.js';

/**
 * Резолвит UUID типа связи по id (если передан напрямую) или по названию/ключу
 * (поиск через listLinkTypes, регистронезависимое сравнение по name/key, приоритет
 * точного совпадения). Бросает Error с понятным сообщением и списком кандидатов,
 * если тип связи не найден или неоднозначен.
 */
export async function resolveLinkTypeId(
  client: TeamStormClient,
  params: {
    workspace?: string;
    linkTypeId?: string;
    linkTypeName?: string;
  }
): Promise<string> {
  if (params.linkTypeId) {
    return params.linkTypeId;
  }

  const name = params.linkTypeName;
  if (!name) {
    throw new Error('Укажите linkTypeId или linkTypeName.');
  }

  const result = await client.listLinkTypes(params.workspace);
  const needle = name.trim().toLowerCase();
  const matches = result.items.filter(
    (t) => t.name.toLowerCase() === needle || t.key?.toLowerCase() === needle
  );

  if (matches.length === 0) {
    const available = result.items.map((t) => `  - ${t.name}${t.key ? ` (${t.key})` : ''}`).join('\n');
    throw new Error(`Тип связи «${name}» не найден. Доступные типы связей:\n${available}`);
  }

  if (matches.length > 1) {
    const candidates = matches.map((t) => `  - ${t.name} (\`${t.id}\`)`).join('\n');
    throw new Error(
      `Найдено несколько типов связи с названием «${name}». Укажите linkTypeId напрямую:\n${candidates}`
    );
  }

  return matches[0].id;
}
