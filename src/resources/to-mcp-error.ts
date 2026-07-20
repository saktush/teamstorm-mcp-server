import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Ресурсы не могут вернуть {@link https://modelcontextprotocol.io | isError} — у ReadResourceResult
 * нет такого поля (в отличие от инструментов). Значит, обработчик ресурса обязан бросить ошибку,
 * чтобы SDK превратил её в корректный JSON-RPC error-ответ. Этот помощник приводит любую ошибку
 * к McpError: если TeamStorm-клиент вернул 404 (кодируется в тексте сообщения) — InvalidParams,
 * иначе InternalError. Уже готовый McpError пробрасывается без изменений.
 */
export function toMcpError(error: unknown, fallbackMessage: string): McpError {
  if (error instanceof McpError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const code = /\b404\b/.test(message) ? ErrorCode.InvalidParams : ErrorCode.InternalError;
  return new McpError(code, `${fallbackMessage}: ${message}`);
}
