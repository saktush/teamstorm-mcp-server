import { describe, it, assertType, expectTypeOf } from 'vitest';
import type { TeamStormClient } from '../client/teamstorm.js';
import type {
  TeamStormAttributeListResponse,
  TeamStormDocumentStatusListResponse,
  TeamStormDocumentPermission,
  TeamStormCreateTaskRequest,
  TeamStormTaskListResponse,
  TeamStormUpdatedTaskListResponse,
  TeamStormTask,
  TeamStormUpdatedTask,
  TeamStormWorkspace,
  TeamStormWorkspaceListResponse,
  TeamStormLinkType,
  TeamStormPermission,
  TeamStormCommentVisibility,
  TeamStormPatchAttributeRequest,
  TeamStormUser,
  TeamStormWorkflow,
  TeamStormWorkflowStatus,
  TeamStormTransition,
  TeamStormType,
  TeamStormTypeColor,
  TeamStormWorkspaceUserListResponse,
  TeamStormUserListResponse,
  TeamStormAttributeType,
  TeamStormUpdateTaskRequest,
} from '../client/types.js';

// Type assertions and @ts-expect-error fixtures are checked by npm run typecheck.
// Vitest's normal runtime transform does not perform these compile-time checks.

const mockUser: TeamStormUser = {
  id: 'u1',
  displayName: 'Jane Doe',
  username: 'jane',
  email: 'jane@test.com',
};

const mockWorkspace: TeamStormWorkspace = { id: 'w1', key: 'WS', name: 'Workspace' };

describe('Part 1 — phantom fields removed (B1-B4)', () => {
  it('B1: TeamStormAttributeListResponse (task attribute VALUES) has only `items`', () => {
    expectTypeOf<keyof TeamStormAttributeListResponse>().toEqualTypeOf<'items'>();
    assertType<TeamStormAttributeListResponse>({ items: [] });
    assertType<TeamStormAttributeListResponse>({
      // @ts-expect-error — fromToken/maxItemsCount/nextToken were removed, not just relaxed
      fromToken: 'x',
      items: [],
    });
  });

  it('B2: TeamStormDocumentStatusListResponse has only `items` (not paginated)', () => {
    expectTypeOf<keyof TeamStormDocumentStatusListResponse>().toEqualTypeOf<'items'>();
    assertType<TeamStormDocumentStatusListResponse>({ items: [] });
    assertType<TeamStormDocumentStatusListResponse>({
      // @ts-expect-error — ListDocumentStatuses takes no pagination params at all
      nextToken: 'x',
      items: [],
    });
  });

  it('B3: TeamStormDocumentPermission carries nested user/group, never raw userId/groupId', () => {
    assertType<TeamStormDocumentPermission>({
      type: 'User',
      permissionId: 'p1',
      workspaceId: 'w1',
      documentId: 'd1',
      accessLevel: 'Read',
      user: mockUser,
    });
    assertType<TeamStormDocumentPermission>({
      type: 'User',
      permissionId: 'p1',
      workspaceId: 'w1',
      documentId: 'd1',
      accessLevel: 'Read',
      // @ts-expect-error — userId/groupId belong to the request bodies, not this response
      userId: 'u1',
    });
  });

  it('B4: TeamStormCreateTaskRequest has no storyPoints (PATCH-body-only field)', () => {
    assertType<TeamStormCreateTaskRequest>({ name: 'T', type: 'Task' });
    assertType<TeamStormCreateTaskRequest>({
      name: 'T',
      type: 'Task',
      // @ts-expect-error — CreateWorkitemRequestBody (additionalProperties:false) has no storyPoints
      storyPoints: 3,
    });
  });
});

describe('Part 2 — optionality fixed to match the spec (B5-B12)', () => {
  it('B5: TeamStormTaskListResponse / TeamStormUpdatedTaskListResponse pagination triple is optional', () => {
    assertType<TeamStormTaskListResponse>({ items: [] });
    assertType<TeamStormUpdatedTaskListResponse>({ items: [] });
    assertType<TeamStormTaskListResponse>({
      items: [],
      fromToken: null,
      maxItemsCount: null,
      nextToken: null,
    });
    assertType<TeamStormUpdatedTaskListResponse>({
      items: [],
      fromToken: null,
      maxItemsCount: null,
      nextToken: null,
    });
  });

  it('B6: TeamStormTask no longer requires description/type/workflow/status/createdDate/originalEstimate/timeSpent/remainingEstimate/storyPoints/changedBy', () => {
    const minimal: TeamStormTask = {
      id: 't1',
      key: 'TS-1',
      name: 'Task',
      author: mockUser,
      attributes: [],
      portfolios: [],
      workspace: mockWorkspace,
    };
    assertType<TeamStormTask>(minimal);
    assertType<TeamStormTask>({
      ...minimal,
      description: null,
      type: null,
      workflow: null,
      status: null,
      createdDate: null,
      originalEstimate: null,
      timeSpent: null,
      remainingEstimate: null,
      storyPoints: null,
      changedBy: null,
    });
  });

  it('B6: TeamStormUpdatedTask.changeDate is optional', () => {
    const minimal: TeamStormUpdatedTask = {
      id: 't1',
      key: 'TS-1',
      name: 'Task',
      author: mockUser,
      attributes: [],
      portfolios: [],
      workspace: mockWorkspace,
    };
    assertType<TeamStormUpdatedTask>(minimal);
    assertType<TeamStormUpdatedTask>({ ...minimal, changeDate: null });
  });

  it('B7: TeamStormWorkspace description/author are optional AND nullable', () => {
    assertType<TeamStormWorkspace>({ id: 'w1', key: 'K', name: 'N' });
    assertType<TeamStormWorkspace>({
      id: 'w1',
      key: 'K',
      name: 'N',
      description: null,
      author: null,
    });
  });

  it('B8: TeamStormWorkspaceListResponse.items is the unified TeamStormWorkspace (carries description/author)', () => {
    expectTypeOf<TeamStormWorkspaceListResponse['items']>().toEqualTypeOf<TeamStormWorkspace[]>();
  });

  it('B9: TeamStormLinkType.key is optional and NOT nullable', () => {
    assertType<TeamStormLinkType>({ id: 'l1', name: 'Relates' });
    assertType<TeamStormLinkType>({
      id: 'l1',
      name: 'Relates',
      // @ts-expect-error — spec does not mark `key` nullable, unlike most optional strings here
      key: null,
    });
  });

  it('B10: TeamStormPermission.type and CommentVisibility accessList[].type are required', () => {
    // @ts-expect-error — `type` is the discriminator on SharedWorkitemPermissionModel, required
    assertType<TeamStormPermission>({
      permissionId: 'p1',
      workspaceId: 'w1',
      workitemId: 'wi1',
      accessLevel: 'Read',
    });
    assertType<TeamStormCommentVisibility>({
      visibilityType: 'All',
      accessList: [
        // @ts-expect-error — `type` is PrincipalModel's discriminator, required
        { id: 'a1' },
      ],
    });
  });

  it('B11: patchDocumentPermission body.accessLevel is optional and nullable', () => {
    type PatchDocPermissionBody = Parameters<TeamStormClient['patchDocumentPermission']>[2];
    assertType<PatchDocPermissionBody>({});
    assertType<PatchDocPermissionBody>({ accessLevel: null });
  });

  it('B12 / RULING R8: PatchAttributeRequest.options[].id is omittable AND accepts null, not required', () => {
    assertType<TeamStormPatchAttributeRequest>({ options: [{ name: 'A' }] });
    assertType<TeamStormPatchAttributeRequest>({ options: [{ id: null, name: 'A' }] });
  });
});

type RequiredKeys<T> = {
  [K in keyof T]-?: Record<never, never> extends Pick<T, K> ? never : K;
}[keyof T];

describe('Part 3/4 — response shapes and request capabilities (B13-B20)', () => {
  it('B13: workflow fields and nested status/transition fields are required', () => {
    expectTypeOf<RequiredKeys<TeamStormWorkflow>>().toEqualTypeOf<
      'id' | 'name' | 'type' | 'statuses' | 'transitions'
    >();
    expectTypeOf<TeamStormWorkflow['type']>().toEqualTypeOf<'Workitem' | 'Portfolio'>();
    expectTypeOf<TeamStormWorkflow['description']>().toEqualTypeOf<string | null | undefined>();
    expectTypeOf<RequiredKeys<TeamStormWorkflowStatus>>().toEqualTypeOf<
      'id' | 'name' | 'category' | 'positionX' | 'positionY'
    >();
    expectTypeOf<RequiredKeys<TeamStormTransition>>().toEqualTypeOf<
      'transitionId' | 'nextStatus' | 'fromAllStatuses' | 'isInitial'
    >();
    assertType<TeamStormTransition>({
      transitionId: 'tr1',
      fromStatus: null,
      nextStatus: { id: 's1', name: 'Open', category: { id: 'c1', name: 'New' } },
      fromAllStatuses: false,
      isInitial: true,
    });
  });

  it('B14: type carries required metadata and a bounded color enum', () => {
    expectTypeOf<RequiredKeys<TeamStormType>>().toEqualTypeOf<
      | 'id'
      | 'name'
      | 'color'
      | 'icon'
      | 'workflow'
      | 'attributes'
      | 'estimatesInTime'
      | 'estimatesInStoryPoints'
      | 'showTimeTracking'
    >();
    expectTypeOf<TeamStormType['attributes']>().toEqualTypeOf<
      import('../client/types.js').TeamStormAttributeModel[]
    >();
    expectTypeOf<TeamStormType['workflow']>().toEqualTypeOf<
      import('../client/types.js').TeamStormWorkflowThumb
    >();
    // @ts-expect-error — TypeColor is the spec's enum, not arbitrary CSS colors
    assertType<TeamStormTypeColor>('chartreuse');
    assertType<TeamStormTask['type']>({ id: 't1', name: 'Task' });
    assertType<TeamStormTask['workflow']>({ id: 'w1', name: 'Default' });
  });

  it('B15: createTask supports startDate; B4 leaves storyPoints on PATCH', () => {
    assertType<TeamStormCreateTaskRequest>({
      name: 'T',
      type: 'Task',
      startDate: '2026-09-20T00:00:00Z',
    });
    assertType<TeamStormCreateTaskRequest>({ name: 'T', type: 'Task', startDate: null });
    assertType<TeamStormUpdateTaskRequest>({ storyPoints: 3 });
  });

  it('B16: workspace user lists expose pagination; global lists retain only items', () => {
    expectTypeOf<
      Awaited<ReturnType<TeamStormClient['listUsers']>>
    >().toEqualTypeOf<TeamStormWorkspaceUserListResponse>();
    expectTypeOf<
      Awaited<ReturnType<TeamStormClient['listAllUsers']>>
    >().toEqualTypeOf<TeamStormUserListResponse>();
    expectTypeOf<keyof TeamStormUserListResponse>().toEqualTypeOf<'items'>();
    assertType<TeamStormWorkspaceUserListResponse>({
      items: [],
      fromToken: null,
      maxItemsCount: null,
      nextToken: 'next',
    });
  });

  it('B20: listAttributes constrains type and supports exact matching', () => {
    type Params = Parameters<TeamStormClient['listAttributes']>[0];
    expectTypeOf<Params['type']>().toEqualTypeOf<TeamStormAttributeType | undefined>();
    assertType<Params>({ type: 'Tag', isFullNameMatching: false });
    // @ts-expect-error — unsupported attribute types must be rejected
    assertType<Params>({ type: 'Boolean' });
  });
});

describe('Rulings and task-2a boundaries', () => {
  it('R1/R3/R5 retain optional identifiers; R8 accepts omission, null and an existing id', () => {
    assertType<import('../client/types.js').TeamStormFolderModel>({
      id: 'f1',
      name: 'Root',
      parentId: null,
    });
    assertType<TeamStormCreateTaskRequest>({ name: 'Task', type: 'Task' });
    assertType<import('../client/types.js').TeamStormCreateAttributeOptionRequest>({ name: 'New' });
    assertType<TeamStormPatchAttributeRequest>({ options: [{ id: 'existing', name: 'New' }] });
  });

  it('B1: getTaskAttributes returns values while listAttributes retains definitions', () => {
    expectTypeOf<
      Awaited<ReturnType<TeamStormClient['getTaskAttributes']>>
    >().toEqualTypeOf<TeamStormAttributeListResponse>();
    expectTypeOf<Awaited<ReturnType<TeamStormClient['listAttributes']>>>().toEqualTypeOf<
      import('../client/types.js').TeamStormAttributeModelListResponse
    >();
  });
});
