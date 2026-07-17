import { describe, it, expect, vi } from 'vitest';
import { computeSprintCapacity } from '../tools/sprints/get.js';
import { resolveAgileId } from '../tools/sprints/resolve-agile.js';
import type { TeamStormClient } from '../client/teamstorm.js';
import type { TeamStormSprint, TeamStormAgile } from '../client/types.js';

function buildSprint(overrides: Partial<TeamStormSprint> = {}): TeamStormSprint {
  return {
    id: 'sp1',
    name: 'Sprint 1',
    isBacklog: false,
    ...overrides,
  };
}

function buildUser(id: string) {
  return { id, displayName: `User ${id}`, username: id, email: `${id}@test.com` };
}

describe('computeSprintCapacity', () => {
  it('sums (workdays - daysOff) * hoursPerDay across the team', () => {
    const sprint = buildSprint({
      workdays: 10,
      team: [
        { user: buildUser('u1'), hoursPerDay: 8, daysOff: 2 },
        { user: buildUser('u2'), hoursPerDay: 6, daysOff: 0 },
      ],
    });

    const result = computeSprintCapacity(sprint);

    expect(result.perMember).toEqual([
      { displayName: 'User u1', hours: 64 },
      { displayName: 'User u2', hours: 60 },
    ]);
    expect(result.totalHours).toBe(124);
  });

  it('clamps a member to 0 hours when daysOff exceeds workdays', () => {
    const sprint = buildSprint({
      workdays: 5,
      team: [{ user: buildUser('u1'), hoursPerDay: 8, daysOff: 10 }],
    });

    const result = computeSprintCapacity(sprint);

    expect(result.perMember).toEqual([{ displayName: 'User u1', hours: 0 }]);
    expect(result.totalHours).toBe(0);
  });

  it('returns zero capacity for a sprint with no team', () => {
    const sprint = buildSprint({ workdays: 10 });

    const result = computeSprintCapacity(sprint);

    expect(result.perMember).toEqual([]);
    expect(result.totalHours).toBe(0);
  });

  it('treats a missing workdays field as 0', () => {
    const sprint = buildSprint({
      team: [{ user: buildUser('u1'), hoursPerDay: 8, daysOff: 0 }],
    });

    const result = computeSprintCapacity(sprint);

    expect(result.totalHours).toBe(0);
  });
});

function buildAgile(overrides: Partial<TeamStormAgile> = {}): TeamStormAgile {
  return {
    id: 'agile1',
    name: 'Agile board',
    folderId: 'folder1',
    estimatesType: 'EstimatesInTime',
    ...overrides,
  };
}

function buildClient(listAgile: ReturnType<typeof vi.fn>): TeamStormClient {
  return { listAgile } as unknown as TeamStormClient;
}

describe('resolveAgileId', () => {
  it('returns agileId directly when provided, without calling listAgile', async () => {
    const listAgile = vi.fn();
    const client = buildClient(listAgile);

    const result = await resolveAgileId(client, { workspace: 'ws1', agileId: 'agile-direct' });

    expect(result).toBe('agile-direct');
    expect(listAgile).not.toHaveBeenCalled();
  });

  it('resolves via folderId when exactly one Agile board is found', async () => {
    const listAgile = vi.fn().mockResolvedValue([buildAgile({ id: 'agile1' })]);
    const client = buildClient(listAgile);

    const result = await resolveAgileId(client, { workspace: 'ws1', folderId: 'folder1' });

    expect(result).toBe('agile1');
    expect(listAgile).toHaveBeenCalledWith('ws1', 'folder1');
  });

  it('throws a clear error when the folder has no Agile board', async () => {
    const listAgile = vi.fn().mockResolvedValue([]);
    const client = buildClient(listAgile);

    await expect(resolveAgileId(client, { workspace: 'ws1', folderId: 'folder1' })).rejects.toThrow(
      /нет Agile-борда/
    );
  });

  it('throws with candidates when multiple Agile boards match the folder', async () => {
    const listAgile = vi
      .fn()
      .mockResolvedValue([
        buildAgile({ id: 'a1', name: 'Board A' }),
        buildAgile({ id: 'a2', name: 'Board B' }),
      ]);
    const client = buildClient(listAgile);

    await expect(resolveAgileId(client, { workspace: 'ws1', folderId: 'folder1' })).rejects.toThrow(
      /несколько Agile-бордов/
    );
  });

  it('throws when neither folderId nor agileId is provided', async () => {
    const listAgile = vi.fn();
    const client = buildClient(listAgile);

    await expect(resolveAgileId(client, { workspace: 'ws1' })).rejects.toThrow(
      /Укажите folderId или agileId/
    );
  });
});
