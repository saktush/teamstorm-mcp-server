import axios, { AxiosInstance, AxiosError } from 'axios';
import http from 'node:http';
import https from 'node:https';
import * as path from 'path';
import { maskToken } from '../config.js';
import { logger } from '../utils/logger.js';
import type {
  TeamStormTask,
  TeamStormTaskListResponse,
  TeamStormCreateTaskRequest,
  TeamStormUpdateTaskRequest,
  TeamStormUserListResponse,
  TeamStormSprint,
  TeamStormSprintListResponse,
  TeamStormWorkflowListResponse,
  TeamStormTypeListResponse,
  TeamStormComment,
  TeamStormCommentListResponse,
  TeamStormCommentVisibility,
  TeamStormAttributeListResponse,
  TeamStormAttributeModel,
  TeamStormCreateAttributeRequest,
  TeamStormPatchAttributeRequest,
  TeamStormCreateAttributeOptionRequest,
  TeamStormPatchAttributeOptionRequest,
  TeamStormAttachment,
  TeamStormAttachmentListResponse,
  TeamStormAttachmentVersion,
  TeamStormAttachmentVersionListResponse,
  TeamStormPermissionListResponse,
  TeamStormLinkListResponse,
  TeamStormUpdatedTaskListResponse,
  TeamStormFolderModel,
  TeamStormFolderListResponse,
  TeamStormCreateFolderRequest,
  TeamStormPatchFolderRequest,
  TeamStormPortfolioModelList,
  TeamStormPortfolioModel,
  TeamStormCreatePortfolioRequest,
  TeamStormPatchPortfolioRequest,
  TeamStormPortfolioElementModelList,
  TeamStormPortfolioElementModel,
  TeamStormCreatePortfolioElementRequest,
  TeamStormPatchPortfolioElementRequest,
  TeamStormWorkspaceListResponse,
  TeamStormDocument,
  TeamStormDocumentListResponse,
  TeamStormCreateDocumentRequest,
  TeamStormDocumentStatus,
  TeamStormDocumentStatusListResponse,
  TeamStormDocumentPermission,
} from './types.js';

export class TeamStormClient {
  private client: AxiosInstance;
  private defaultWorkspace?: string;
  private apiToken: string;
  private apiUrl?: string;
  private internalApiUrl?: string;

  /** Masked token preview for safe logging (first 4 + last 4 chars) */
  get tokenPreview(): string {
    return maskToken(this.apiToken);
  }

  /**
   * Check if base URL has been configured.
   */
  hasBaseUrl(): boolean {
    return !!this.apiUrl;
  }

  /**
   * Throw if base URL has not been configured.
   * Called at the start of every API method to ensure the LLM passed apiUrl.
   */
  private requireBaseUrl(): void {
    if (!this.apiUrl || !this.apiUrl.trim()) {
      throw new Error(
        'TeamStorm API URL не задан.\n' +
          '💡 Установите TEAMSTORM_API_URL в .env файле или передайте apiUrl в инструмент.\n' +
          '   Формат: http://<teamstorm-host>/cwm/public/api/v1'
      );
    }
  }

  /**
   * Switch account at runtime — updates Authorization header on the shared axios instance.
   * Useful for multi-account / per-session scenarios.
   */
  setToken(token: string): void {
    this.apiToken = token;
    this.client.defaults.headers.common['Authorization'] = `PrivateToken ${token}`;
  }

  /**
   * Switch API base URL at runtime — updates baseURL on the shared axios instance.
   * Useful when the LLM provides a custom API endpoint per request.
   * @throws Error if baseUrl does not end with /cwm/public/api/v1
   */
  setBaseUrl(baseUrl: string): void {
    let normalized = baseUrl.replace(/\/+$/, '');
    if (!normalized.endsWith('/cwm/public/api/v1')) {
      normalized = `${normalized}/cwm/public/api/v1`;
    }
    if (!normalized.endsWith('/cwm/public/api/v1')) {
      throw new Error(
        `Invalid TeamStorm API URL: "${baseUrl}". ` +
          `Expected format: http://<host>/cwm/public/api/v1`
      );
    }
    this.apiUrl = normalized;
    this.internalApiUrl = normalized.replace(/\/cwm\/public\/api\/v1$/, '');
    this.client.defaults.baseURL = normalized;
  }

  setBaseUrlRaw(baseUrl: string): void {
    this.apiUrl = baseUrl;
    this.internalApiUrl = baseUrl.replace(/\/cwm\/public\/api\/v1$/, '');
    this.client.defaults.baseURL = baseUrl;
  }

  constructor(token: string, baseUrl?: string, workspace?: string) {
    this.defaultWorkspace = workspace;
    this.apiToken = token;
    this.apiUrl = baseUrl;
    this.internalApiUrl = baseUrl?.replace(/\/cwm\/public\/api\/v1$/, '');
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30_000,
      httpAgent: new http.Agent({ keepAlive: true }),
      httpsAgent: new https.Agent({ keepAlive: true }),
      headers: {
        Authorization: `PrivateToken ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Add rate limiting awareness interceptor
    this.client.interceptors.response.use(
      (response) => {
        const rateLimitHeaders = {
          limit: response.headers['x-ratelimit-limit'],
          remaining: response.headers['x-ratelimit-remaining'],
          reset: response.headers['x-ratelimit-reset'],
        };

        // Log warning when approaching rate limit
        if (rateLimitHeaders.remaining && rateLimitHeaders.limit) {
          const remaining = Number(rateLimitHeaders.remaining);
          const limit = Number(rateLimitHeaders.limit);
          const percentage = (remaining / limit) * 100;

          if (percentage < 10) {
            logger.warn(
              { remaining, limit, percentage: percentage.toFixed(1) },
              'Rate limit critical'
            );
          } else if (percentage < 25) {
            logger.warn(
              { remaining, limit, percentage: percentage.toFixed(1) },
              'Rate limit notice'
            );
          }
        }

        return response;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  private resolveWorkspace(workspace?: string): string {
    const ws = workspace || this.defaultWorkspace;
    if (!ws) {
      throw new Error(
        'Workspace не указан.\n' +
          '💡 Укажите workspace в параметрах инструмента или установите TEAMSTORM_WORKSPACE в .env файле.\n' +
          '   Для получения списка доступных пространств используйте teamstorm_list_workspaces'
      );
    }
    return ws;
  }

  private handleError(error: AxiosError): never {
    if (error.response) {
      const status = error.response.status;
      const message = this.extractErrorMessage(error.response.data);
      const path = error.config?.url || 'unknown';

      // Provide actionable error messages based on status code
      let hint = '';
      switch (status) {
        case 401:
          hint = '💡 Проверьте TEAMSTORM_API_TOKEN в .env файле';
          break;
        case 403:
          hint = '💡 У пользователя нет прав для выполнения этого действия';
          break;
        case 404:
          hint =
            '💡 Проверьте workspace ID и ID задачи. Для получения списка доступных пространств используйте teamstorm_list_workspaces';
          break;
        case 422:
          hint = '💡 Проверьте обязательные поля и форматы данных';
          break;
        case 429:
          hint = '💡 Слишком много запросов. Подождите перед повторной попыткой';
          break;
        case 500:
        case 502:
        case 503:
          hint = '💡 TeamStorm API временно недоступен. Попробуйте позже';
          break;
      }

      throw new Error(`TeamStorm API error ${status} at ${path}: ${message}\n${hint}`.trim());
    } else if (error.request) {
      throw new Error(
        `Network error: Unable to reach TeamStorm API\n` +
          '💡 Проверьте:\n' +
          '  • Доступность API (ping <teamstorm-host>)\n' +
          '  • Настройки прокси/фаервола\n' +
          '  • TEAMSTORM_API_URL в .env файле'
      );
    } else {
      throw new Error(
        `Request configuration error: ${error.message}\n` + '💡 Проверьте параметры запроса'
      );
    }
  }

  private extractErrorMessage(data: unknown): string {
    if (typeof data === 'string' && data.length > 0) {
      return data.slice(0, 500);
    }
    if (typeof data === 'object' && data !== null) {
      if ('message' in data && (data as { message: unknown }).message) {
        return String((data as { message: unknown }).message);
      }
      if ('error' in data && (data as { error: unknown }).error) {
        return String((data as { error: unknown }).error);
      }
      if ('title' in data && (data as { title: unknown }).title) {
        return String((data as { title: unknown }).title);
      }
      if ('errors' in data) {
        return JSON.stringify((data as { errors: unknown }).errors).slice(0, 500);
      }
      const raw = JSON.stringify(data).slice(0, 500);
      if (raw !== '{}') return raw;
    }
    return 'Unknown error';
  }

  /** Remove sensitive headers (Authorization, Cookie) before logging */
  private sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...headers };
    for (const key of Object.keys(sanitized)) {
      if (/^(authorization|cookie|set-cookie)$/i.test(key)) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  async listTasks(params: {
    workspace?: string;
    type?: string;
    parent?: string;
    sprintId?: string;
    portfolioElementId?: string;
    name?: string;
    assignee?: string;
    author?: string;
    status?: string;
    statusCategory?: string;
    fromToken?: string;
    maxItemsCount?: number;
  }): Promise<TeamStormTaskListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const response = await this.client.get<TeamStormTaskListResponse>(
        `/workspaces/${ws}/workitems`,
        { params: { ...params, workspace: undefined } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getTask(taskId: string, workspace?: string): Promise<TeamStormTask> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormTask>(
        `/workspaces/${ws}/workitems/${taskId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createTask(
    data: TeamStormCreateTaskRequest & { workspace?: string }
  ): Promise<TeamStormTask> {
    this.requireBaseUrl();
    const { workspace, ...taskData } = data;
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormTask>(
        `/workspaces/${ws}/workitems`,
        taskData
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async updateTask(
    taskId: string,
    data: TeamStormUpdateTaskRequest & { workspace?: string }
  ): Promise<TeamStormTask> {
    this.requireBaseUrl();
    const { workspace, ...updateData } = data;
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.patch<TeamStormTask>(
        `/workspaces/${ws}/workitems/${taskId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async deleteTask(taskId: string, workspace?: string): Promise<void> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      await this.client.delete(`/workspaces/${ws}/workitems/${taskId}`);
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getTaskCount(workspace?: string): Promise<number> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<{ count: number }>(
        `/workspaces/${ws}/workitems/count`
      );
      return response.data.count;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Phase B: Additional API methods

  async listUsers(workspace?: string): Promise<TeamStormUserListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormUserListResponse>(`/workspaces/${ws}/users`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listSprints(workspace?: string): Promise<TeamStormSprintListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormSprintListResponse>(
        `/workspaces/${ws}/sprints`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getSprint(sprintId: string, workspace?: string): Promise<TeamStormSprint> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormSprint>(
        `/workspaces/${ws}/sprints/${sprintId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listWorkspaces(params?: {
    fromToken?: string;
    maxItemsCount?: number;
  }): Promise<TeamStormWorkspaceListResponse> {
    this.requireBaseUrl();
    try {
      const response = await this.client.get<TeamStormWorkspaceListResponse>('/workspaces', {
        params,
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listWorkflows(workspace?: string): Promise<TeamStormWorkflowListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormWorkflowListResponse>(
        `/workspaces/${ws}/workflows`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listTaskTypes(workspace?: string): Promise<TeamStormTypeListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormTypeListResponse>(`/workspaces/${ws}/types`);
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Space attributes
  async listAttributes(params: {
    workspace?: string;
    name?: string;
    type?: string;
    fromToken?: string;
    maxItemsCount?: number;
  }): Promise<TeamStormAttributeListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const response = await this.client.get<TeamStormAttributeListResponse>(
        `/workspaces/${ws}/attributes`,
        { params: { ...params, workspace: undefined } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createAttribute(
    data: TeamStormCreateAttributeRequest,
    workspace?: string
  ): Promise<TeamStormAttributeModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormAttributeModel>(
        `/workspaces/${ws}/attributes`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async patchAttribute(
    attributeId: string,
    data: TeamStormPatchAttributeRequest,
    workspace?: string
  ): Promise<TeamStormAttributeModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.patch<TeamStormAttributeModel>(
        `/workspaces/${ws}/attributes/${attributeId}`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async addAttributeOption(
    attributeId: string,
    data: TeamStormCreateAttributeOptionRequest,
    workspace?: string
  ): Promise<TeamStormAttributeModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormAttributeModel>(
        `/workspaces/${ws}/attributes/${attributeId}/options`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async patchAttributeOption(
    attributeId: string,
    data: TeamStormPatchAttributeOptionRequest,
    workspace?: string
  ): Promise<TeamStormAttributeModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.patch<TeamStormAttributeModel>(
        `/workspaces/${ws}/attributes/${attributeId}/options`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // ============ READ OPERATIONS ============

  // Tasks by parent
  async listTasksByParent(params: {
    workspace?: string;
    parent: string;
    withSubItems?: boolean;
  }): Promise<TeamStormTask[]> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const response = await this.client.get<TeamStormTask[]>(
        `/workspaces/${ws}/workitems/by-parent/${params.parent}`,
        { params: { withSubItems: params.withSubItems || false, workspace: undefined } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Updated tasks
  async listUpdatedTasks(params: {
    workspace?: string;
    changedFromDate: string;
    changedToDate?: string;
    fromToken?: string;
    maxItemsCount?: number;
  }): Promise<TeamStormUpdatedTaskListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const response = await this.client.get<TeamStormUpdatedTaskListResponse>(
        `/workspaces/${ws}/workitems/updates`,
        { params: { ...params, workspace: undefined } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Task attributes
  async getTaskAttributes(
    taskId: string,
    workspace?: string
  ): Promise<TeamStormAttributeListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormAttributeListResponse>(
        `/workspaces/${ws}/workitems/${taskId}/attributes`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Comments
  async listTaskComments(
    taskId: string,
    workspace?: string
  ): Promise<TeamStormCommentListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormCommentListResponse>(
        `/workspaces/${ws}/workitems/${taskId}/comments`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createTaskComment(
    taskId: string,
    text: string,
    workspace?: string
  ): Promise<TeamStormComment> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormComment>(
        `/workspaces/${ws}/workitems/${taskId}/comments`,
        { text }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getCommentVisibility(
    taskId: string,
    commentId: string,
    workspace?: string
  ): Promise<TeamStormCommentVisibility> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormCommentVisibility>(
        `/workspaces/${ws}/workitems/${taskId}/comments/${commentId}/visibility`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Attachments
  async listTaskAttachments(
    taskId: string,
    workspace?: string
  ): Promise<TeamStormAttachmentListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormAttachmentListResponse>(
        `/workspaces/${ws}/workitems/${taskId}/attachments`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getTaskAttachment(
    taskId: string,
    attachmentId: string,
    workspace?: string
  ): Promise<TeamStormAttachment> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormAttachment>(
        `/workspaces/${ws}/workitems/${taskId}/attachments/${attachmentId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listAttachmentVersions(
    taskId: string,
    workspace?: string
  ): Promise<TeamStormAttachmentVersionListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormAttachmentVersionListResponse>(
        `/workspaces/${ws}/workitems/${taskId}/attachments/versions`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getAttachmentVersion(
    taskId: string,
    attachmentId: string,
    version: number,
    workspace?: string
  ): Promise<TeamStormAttachmentVersion> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormAttachmentVersion>(
        `/workspaces/${ws}/workitems/${taskId}/attachments/${attachmentId}/versions/${version}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Sharing / Access Control
  async getTaskPermissions(
    taskId: string,
    workspace?: string
  ): Promise<TeamStormPermissionListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormPermissionListResponse>(
        `/workspaces/${ws}/workitems/${taskId}/sharing`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Links
  async getTaskLinks(taskId: string, workspace?: string): Promise<TeamStormLinkListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormLinkListResponse>(
        `/workspaces/${ws}/workitems/${taskId}/links`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async uploadTaskAttachmentBuffer(
    taskId: string,
    workspace?: string,
    buffer: Buffer = Buffer.alloc(0),
    fileName = 'file'
  ): Promise<TeamStormAttachment> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const attachmentId = crypto.randomUUID();
      const ext = path.extname(fileName).toLowerCase();
      const mimeType =
        ext === '.png'
          ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg'
            ? 'image/jpeg'
            : ext === '.gif'
              ? 'image/gif'
              : ext === '.pdf'
                ? 'application/pdf'
                : ext === '.zip'
                  ? 'application/zip'
                  : 'application/octet-stream';

      const boundary = `----FormBoundary${crypto.randomUUID().replace(/-/g, '')}`;
      const encodedFilename = encodeURIComponent(fileName);

      const body = Buffer.concat([
        Buffer.from(`--${boundary}\r\n`),
        Buffer.from(
          `Content-Disposition: form-data; name="file"; filename="${fileName}"; filename*=UTF-8''${encodedFilename}\r\n`
        ),
        Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`),
        buffer,
        Buffer.from(`\r\n`),
        Buffer.from(`--${boundary}--\r\n`),
      ]);

      await this.client.post(
        `/workspaces/${encodeURIComponent(ws)}/workitems/${encodeURIComponent(taskId)}/attachments/${attachmentId}/upload`,
        body,
        {
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );

      const uploadFileName = fileName;
      const listResponse = await this.client.get<TeamStormAttachmentListResponse>(
        `/workspaces/${encodeURIComponent(ws)}/workitems/${encodeURIComponent(taskId)}/attachments`
      );

      const matched = listResponse.data.items.find(
        (a) => a.name === uploadFileName || a.fileId === attachmentId
      );

      if (!matched) {
        throw new Error(
          `Файл "${uploadFileName}" загружен, но не найден в списке вложений задачи ${taskId}`
        );
      }

      return matched;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const { status, headers, data } = axiosError.response;
        logger.error({
          msg: 'Upload failed',
          status,
          headers: this.sanitizeHeaders(headers as Record<string, unknown>),
          data: JSON.stringify(data),
        });
      }
      this.handleError(axiosError);
    }
  }

  // Time Tracking
  async createTimeEntry(params: {
    taskId: string;
    duration: number;
    startDate: string;
    description?: string;
    entryTypeId?: string | null;
    workspace?: string;
  }): Promise<{
    entryId: string;
    workitemId: string;
    duration: number;
    startDate: string;
    description: string;
    entryType: unknown;
  }> {
    this.requireBaseUrl();
    if (!this.internalApiUrl) {
      throw new Error(
        'TeamStorm API URL не задан или имеет неверный формат.\n' +
          '💡 Укажите apiUrl в формате http://<teamstorm-host>/cwm/public/api/v1'
      );
    }
    try {
      const ws = this.resolveWorkspace(params.workspace);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const workitemUuid = uuidRegex.test(params.taskId)
        ? params.taskId
        : (await this.getTask(params.taskId, ws)).id;

      const body: Record<string, unknown> = {
        workitemId: workitemUuid,
        duration: params.duration,
        startDate: params.startDate,
      };
      if (params.description !== undefined) {
        body.description = params.description;
      }
      if (params.entryTypeId !== undefined) {
        body.entryTypeId = params.entryTypeId;
      }

      const response = await this.client.request({
        method: 'POST',
        url: `${this.internalApiUrl}/tasks/api/v1/workitems/${encodeURIComponent(workitemUuid)}/time-tracking-entries`,
        data: body,
      });
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listTimeEntries(params: { taskId: string; workspace?: string }): Promise<
    Array<{
      entryId: string;
      workitemId: string;
      duration: number;
      startDate: string;
      description: string | null;
      creationDate: string;
      updateDate: string;
      deleteDate: string | null;
      entryType: { typeId: string; typeName: string } | null;
      user: { id: string; displayName: string };
    }>
  > {
    this.requireBaseUrl();
    if (!this.internalApiUrl) {
      throw new Error(
        'TeamStorm API URL не задан или имеет неверный формат.\n' +
          '💡 Укажите apiUrl в формате http://<teamstorm-host>/cwm/public/api/v1'
      );
    }
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const workitemUuid = uuidRegex.test(params.taskId)
        ? params.taskId
        : (await this.getTask(params.taskId, ws)).id;
      const response = await this.client.get(
        `${this.internalApiUrl}/tasks/api/v1/workitems/${workitemUuid}/time-tracking-entries`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async listFolders(params: {
    workspace?: string;
    name?: string;
    parentId?: string;
    fromToken?: string;
    maxItemsCount?: number;
  }): Promise<TeamStormFolderListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const response = await this.client.get<TeamStormFolderListResponse>(
        `/workspaces/${ws}/folders`,
        { params: { ...params, workspace: undefined } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getFolder(folderId: string, workspace?: string): Promise<TeamStormFolderModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormFolderModel>(
        `/workspaces/${ws}/folders/${folderId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createFolder(
    data: TeamStormCreateFolderRequest,
    workspace?: string
  ): Promise<TeamStormFolderModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormFolderModel>(
        `/workspaces/${ws}/folders`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async patchFolder(
    folderId: string,
    data: TeamStormPatchFolderRequest,
    workspace?: string
  ): Promise<TeamStormFolderModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.patch<TeamStormFolderModel>(
        `/workspaces/${ws}/folders/${folderId}`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Portfolios
  // Note: ListPortfolios has no pagination (no fromToken/maxItemsCount) — response is just { items }.
  async listPortfolios(params: {
    workspace?: string;
    name?: string;
    folderId?: string;
  }): Promise<TeamStormPortfolioModelList> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const response = await this.client.get<TeamStormPortfolioModelList>(
        `/workspaces/${ws}/portfolios`,
        { params: { ...params, workspace: undefined } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getPortfolio(portfolioId: string, workspace?: string): Promise<TeamStormPortfolioModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormPortfolioModel>(
        `/workspaces/${ws}/portfolios/${portfolioId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createPortfolio(
    data: TeamStormCreatePortfolioRequest,
    workspace?: string
  ): Promise<TeamStormPortfolioModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormPortfolioModel>(
        `/workspaces/${ws}/portfolios`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async patchPortfolio(
    portfolioId: string,
    data: TeamStormPatchPortfolioRequest,
    workspace?: string
  ): Promise<TeamStormPortfolioModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.patch<TeamStormPortfolioModel>(
        `/workspaces/${ws}/portfolios/${portfolioId}`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Portfolio Elements
  // Note: ListPortfolioElements has no pagination either — response is just { items }.
  async listPortfolioElements(params: {
    workspace?: string;
    name?: string;
    folderId?: string;
    portfolioId?: string;
    status?: string;
  }): Promise<TeamStormPortfolioElementModelList> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const response = await this.client.get<TeamStormPortfolioElementModelList>(
        `/workspaces/${ws}/portfolio-elements`,
        { params: { ...params, workspace: undefined } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getPortfolioElement(
    portfolioElementId: string,
    workspace?: string
  ): Promise<TeamStormPortfolioElementModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormPortfolioElementModel>(
        `/workspaces/${ws}/portfolio-elements/${portfolioElementId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createPortfolioElement(
    data: TeamStormCreatePortfolioElementRequest,
    workspace?: string
  ): Promise<TeamStormPortfolioElementModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormPortfolioElementModel>(
        `/workspaces/${ws}/portfolio-elements`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async patchPortfolioElement(
    portfolioElementId: string,
    data: TeamStormPatchPortfolioElementRequest,
    workspace?: string
  ): Promise<TeamStormPortfolioElementModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.patch<TeamStormPortfolioElementModel>(
        `/workspaces/${ws}/portfolio-elements/${portfolioElementId}`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async assignWorkitemToPortfolioElement(
    portfolioElementId: string,
    workitemId: string,
    workspace?: string
  ): Promise<TeamStormPortfolioElementModel> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormPortfolioElementModel>(
        `/workspaces/${ws}/portfolio-elements/${portfolioElementId}/workitems/${workitemId}`
      );
      // Despite the documented 200 + PortfolioElementModel response, some TeamStorm
      // deployments return an empty body from this endpoint. Fall back to a fresh GET
      // so callers always get a usable model instead of crashing on undefined fields.
      if (response.data && response.data.id) {
        return response.data;
      }
      return await this.getPortfolioElement(portfolioElementId, ws);
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async unassignWorkitemFromPortfolioElement(
    portfolioElementId: string,
    workitemId: string,
    workspace?: string
  ): Promise<void> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      await this.client.delete(
        `/workspaces/${ws}/portfolio-elements/${portfolioElementId}/workitems/${workitemId}`
      );
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Documents
  async listDocuments(params: {
    workspace?: string;
    fromToken?: string;
    maxItemsCount?: number;
  }): Promise<TeamStormDocumentListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(params.workspace);
      const response = await this.client.get<TeamStormDocumentListResponse>(
        `/workspaces/${ws}/documents`,
        { params: { ...params, workspace: undefined } }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getDocument(documentId: string, workspace?: string): Promise<TeamStormDocument> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormDocument>(
        `/workspaces/${ws}/documents/${documentId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createDocument(
    data: TeamStormCreateDocumentRequest,
    workspace?: string
  ): Promise<TeamStormDocument> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormDocument>(
        `/workspaces/${ws}/documents`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async patchDocument(
    documentId: string,
    data: { status?: string | null },
    workspace?: string
  ): Promise<TeamStormDocument> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.patch<TeamStormDocument>(
        `/workspaces/${ws}/documents/${documentId}`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async blockDocument(documentId: string, workspace?: string): Promise<TeamStormDocument> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormDocument>(
        `/workspaces/${ws}/documents/${documentId}/block`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async unblockDocument(documentId: string, workspace?: string): Promise<TeamStormDocument> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormDocument>(
        `/workspaces/${ws}/documents/${documentId}/unblock`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Document sharing
  async listDocumentPermissions(
    documentId: string,
    workspace?: string
  ): Promise<TeamStormDocumentPermission[]> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormDocumentPermission[]>(
        `/workspaces/${ws}/documents/${documentId}/sharing`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createDocumentPermission(
    documentId: string,
    data: {
      type: 'User' | 'Group';
      accessLevel: 'Read' | 'Edit' | 'Comment';
      userId?: string;
      groupId?: string;
    },
    workspace?: string
  ): Promise<TeamStormDocumentPermission> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormDocumentPermission>(
        `/workspaces/${ws}/documents/${documentId}/sharing`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async patchDocumentPermission(
    documentId: string,
    permissionId: string,
    data: { accessLevel: 'Read' | 'Edit' | 'Comment' },
    workspace?: string
  ): Promise<TeamStormDocumentPermission> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.patch<TeamStormDocumentPermission>(
        `/workspaces/${ws}/documents/${documentId}/sharing/${permissionId}`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Document statuses
  async listDocumentStatuses(workspace?: string): Promise<TeamStormDocumentStatusListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormDocumentStatusListResponse>(
        `/workspaces/${ws}/documents-statuses`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getDocumentStatus(statusId: string, workspace?: string): Promise<TeamStormDocumentStatus> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormDocumentStatus>(
        `/workspaces/${ws}/documents-statuses/${statusId}`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Document links
  async getDocumentWorkitemLinks(documentId: string, workspace?: string): Promise<TeamStormTask[]> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormTask[]>(
        `/workspaces/${ws}/documents/${documentId}/workitem-links`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createDocumentWorkitemLink(
    documentId: string,
    data: { workitemWorkspace: string; workitem: string },
    workspace?: string
  ): Promise<void> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      // API возвращает 204 No Content — тела ответа нет
      await this.client.post(`/workspaces/${ws}/documents/${documentId}/workitem-links`, data);
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async getWorkitemDocumentLinks(taskId: string, workspace?: string): Promise<TeamStormDocument[]> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormDocument[]>(
        `/workspaces/${ws}/workitems/${taskId}/document-links`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  // Document comments
  async listDocumentComments(
    documentId: string,
    workspace?: string
  ): Promise<TeamStormCommentListResponse> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.get<TeamStormCommentListResponse>(
        `/workspaces/${ws}/documents/${documentId}/comments`
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }

  async createDocumentComment(
    documentId: string,
    text: string,
    workspace?: string
  ): Promise<TeamStormComment> {
    this.requireBaseUrl();
    try {
      const ws = this.resolveWorkspace(workspace);
      const response = await this.client.post<TeamStormComment>(
        `/workspaces/${ws}/documents/${documentId}/comments`,
        { text }
      );
      return response.data;
    } catch (error) {
      this.handleError(error as AxiosError);
    }
  }
}
