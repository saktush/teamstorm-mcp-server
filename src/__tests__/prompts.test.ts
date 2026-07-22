import { describe, it, expect } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAnalyzeFolderCommentsPrompt } from '../prompts/analyze-folder-comments.js';
import { registerSprintStandupDigestPrompt } from '../prompts/sprint-standup-digest.js';
import { registerDocumentReviewPackagePrompt } from '../prompts/document-review-package.js';
import { registerTaskTriagePrompt } from '../prompts/task-triage.js';

interface CapturedPrompt {
  name: string;
  config: { title?: string; description?: string; argsSchema?: Record<string, unknown> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cb: (...args: any[]) => {
    messages: Array<{ role: string; content: { type: string; text: string } }>;
  };
}

/**
 * Minimal McpServer stub that records the registerPrompt(name, config, cb) call so tests
 * can invoke the handler directly and inspect the returned messages.
 */
function capturePrompt(register: (server: McpServer) => void): CapturedPrompt {
  let captured: CapturedPrompt | undefined;
  const stub = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerPrompt: (name: string, config: any, cb: any) => {
      captured = { name, config, cb };
    },
  } as unknown as McpServer;
  register(stub);
  if (!captured) throw new Error('registerPrompt was not called');
  return captured;
}

describe('teamstorm_analyze_folder_comments prompt', () => {
  const prompt = capturePrompt(registerAnalyzeFolderCommentsPrompt);

  it('registers with the correct name and args schema', () => {
    expect(prompt.name).toBe('teamstorm_analyze_folder_comments');
    expect(Object.keys(prompt.config.argsSchema ?? {})).toEqual(['workspace', 'folderName']);
  });

  it('produces a single user message naming the tool sequence with args substituted', () => {
    const result = prompt.cb({ workspace: 'TS', folderName: 'Backend' }, {});
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    const text = result.messages[0].content.text;
    for (const tool of [
      'teamstorm_folders_find',
      'teamstorm_tasks_list_by_parent',
      'teamstorm_comments_list',
    ]) {
      expect(text).toContain(tool);
    }
    expect(text).toContain('TS');
    expect(text).toContain('Backend');
  });
});

describe('teamstorm_sprint_standup_digest prompt', () => {
  const prompt = capturePrompt(registerSprintStandupDigestPrompt);

  it('registers with the correct name and args schema', () => {
    expect(prompt.name).toBe('teamstorm_sprint_standup_digest');
    expect(Object.keys(prompt.config.argsSchema ?? {})).toEqual(['workspace', 'sprintId']);
  });

  it('produces a message naming the tool sequence with args substituted', () => {
    const result = prompt.cb({ workspace: 'TS', sprintId: 'sp-42' }, {});
    const text = result.messages[0].content.text;
    for (const tool of [
      'teamstorm_sprints_get',
      'teamstorm_tasks_list',
      'teamstorm_tasks_list_updated',
    ]) {
      expect(text).toContain(tool);
    }
    expect(text).toContain('TS');
    expect(text).toContain('sp-42');
  });
});

describe('teamstorm_document_review_package prompt', () => {
  const prompt = capturePrompt(registerDocumentReviewPackagePrompt);

  it('registers with the correct name and args schema', () => {
    expect(prompt.name).toBe('teamstorm_document_review_package');
    expect(Object.keys(prompt.config.argsSchema ?? {})).toEqual(['workspace', 'documentId']);
  });

  it('produces a message naming the tool sequence with args substituted', () => {
    const result = prompt.cb({ workspace: 'TS', documentId: 'doc-7' }, {});
    const text = result.messages[0].content.text;
    for (const tool of [
      'teamstorm_documents_get',
      'teamstorm_document_links_list_by_document',
      'teamstorm_document_comments_list',
    ]) {
      expect(text).toContain(tool);
    }
    expect(text).toContain('TS');
    expect(text).toContain('doc-7');
  });
});

describe('teamstorm_task_triage prompt', () => {
  const prompt = capturePrompt(registerTaskTriagePrompt);

  it('registers with the correct name and optional args schema', () => {
    expect(prompt.name).toBe('teamstorm_task_triage');
    expect(Object.keys(prompt.config.argsSchema ?? {})).toEqual([
      'workspace',
      'status',
      'assignee',
    ]);
  });

  it('names the tool sequence and interpolates provided filters', () => {
    const result = prompt.cb({ workspace: 'TS', status: 'Open', assignee: 'jane' }, {});
    const text = result.messages[0].content.text;
    for (const tool of ['teamstorm_tasks_list', 'teamstorm_attributes_get']) {
      expect(text).toContain(tool);
    }
    expect(text).toContain('TS');
    expect(text).toContain('Open');
    expect(text).toContain('jane');
  });

  it('falls back to default instructions when status/assignee are omitted', () => {
    const result = prompt.cb({ workspace: 'TS' }, {});
    const text = result.messages[0].content.text;
    expect(text).toContain('все открытые статусы');
    expect(text).toContain('неназначенные задачи');
  });
});
