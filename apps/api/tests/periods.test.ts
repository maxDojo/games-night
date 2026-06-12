import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { makeMockPrisma, resetMocks } from './helpers/mockPrisma.js';

describe('period routes', () => {
  let app: FastifyInstance;
  let mocks: ReturnType<typeof makeMockPrisma>['mocks'];
  let token: string;

  beforeAll(async () => {
    const built = makeMockPrisma();
    mocks = built.mocks;
    app = await buildApp({ prisma: built.prisma, disableSockets: true });
    await app.ready();
    token = app.jwt.sign({ sub: 'host_1', email: 'host@x.co' });
  });

  afterAll(async () => await app.close());
  beforeEach(() => resetMocks(mocks));

  const periodFixture = (
    overrides: Partial<{
      hostId: string;
      status: string;
      teamCount: number;
      partyCount: number;
      startsAt: Date | null;
      endsAt: Date | null;
    }> = {},
  ) => ({
    id: 'period_1',
    hostId: overrides.hostId ?? 'host_1',
    name: 'Summer League',
    status: overrides.status ?? 'ACTIVE',
    startsAt: overrides.startsAt ?? null,
    endsAt: overrides.endsAt ?? null,
    maxTeams: 4,
    teamCapacity: 8,
    settings: {},
    createdAt: new Date('2026-06-01T00:00:00.000Z'),
    updatedAt: new Date('2026-06-01T00:00:00.000Z'),
    teams: Array.from({ length: overrides.teamCount ?? 2 }, (_, index) => ({ position: index + 1 })),
    _count: {
      teams: overrides.teamCount ?? 2,
      parties: overrides.partyCount ?? 3,
    },
  });

  const periodTeamFixture = (
    overrides: Partial<{ hostId: string; partyTeamCount: number }> = {},
  ) => ({
    id: 'period_team_1',
    periodId: 'period_1',
    name: 'Red Team',
    color: '#ff0000',
    position: 1,
    capacity: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
    period: { hostId: overrides.hostId ?? 'host_1' },
    _count: { partyTeams: overrides.partyTeamCount ?? 0 },
  });

  it('creates a host-owned period', async () => {
    mocks.period.create.mockImplementation(async ({ data }) => ({
      id: 'period_1',
      status: 'ACTIVE',
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/periods',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Summer League',
        startsAt: '2026-06-01T00:00:00.000Z',
        endsAt: '2026-08-01T00:00:00.000Z',
        maxTeams: 4,
        teamCapacity: 8,
      },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ hostId: 'host_1', name: 'Summer League', maxTeams: 4 });
    expect(mocks.period.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        hostId: 'host_1',
        startsAt: new Date('2026-06-01T00:00:00.000Z'),
        endsAt: new Date('2026-08-01T00:00:00.000Z'),
      }),
    });
  });

  it('rejects an invalid period date range', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/periods',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Backwards',
        startsAt: '2026-08-01T00:00:00.000Z',
        endsAt: '2026-06-01T00:00:00.000Z',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'endsAt must be after startsAt' });
  });

  it('lists host periods with counts', async () => {
    mocks.period.findMany.mockResolvedValue([periodFixture()]);

    const res = await app.inject({
      method: 'GET',
      url: '/v1/periods',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject([{ id: 'period_1', teamCount: 2, partyCount: 3 }]);
    expect(mocks.period.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hostId: 'host_1' } }),
    );
  });

  it('returns period detail for its host', async () => {
    mocks.period.findUnique.mockResolvedValue({
      ...periodFixture(),
      teams: [periodTeamFixture()],
      parties: [],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/periods/period_1',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().teams).toHaveLength(1);
  });

  it('hides periods owned by another host', async () => {
    mocks.period.findUnique.mockResolvedValue({
      ...periodFixture({ hostId: 'other_host' }),
      teams: [],
      parties: [],
    });

    const res = await app.inject({
      method: 'GET',
      url: '/v1/periods/period_1',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('updates a period without shrinking below its team count', async () => {
    mocks.period.findUnique.mockResolvedValue(periodFixture({ teamCount: 3 }));

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/periods/period_1',
      headers: { authorization: `Bearer ${token}` },
      payload: { maxTeams: 2 },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({ error: 'Period already has 3 teams' });
    expect(mocks.period.update).not.toHaveBeenCalled();
  });

  it('creates a reusable team with inherited capacity', async () => {
    mocks.period.findUnique.mockResolvedValue(periodFixture({ teamCount: 2 }));
    mocks.periodTeam.create.mockImplementation(async ({ data }) => ({
      id: 'period_team_3',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/periods/period_1/teams',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Blue Team', color: '#0000ff' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ position: 3, capacity: 8 });
  });

  it('reuses the first free team position after an unused team is deleted', async () => {
    mocks.period.findUnique.mockResolvedValue({
      ...periodFixture({ teamCount: 2 }),
      teams: [{ position: 1 }, { position: 3 }],
    });
    mocks.periodTeam.create.mockImplementation(async ({ data }) => ({
      id: 'period_team_2',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/periods/period_1/teams',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Replacement' },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().position).toBe(2);
  });

  it('blocks reusable teams once a period is completed', async () => {
    mocks.period.findUnique.mockResolvedValue(periodFixture({ status: 'COMPLETED' }));

    const res = await app.inject({
      method: 'POST',
      url: '/v1/periods/period_1/teams',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Late Team' },
    });

    expect(res.statusCode).toBe(409);
    expect(mocks.periodTeam.create).not.toHaveBeenCalled();
  });

  it('updates an owned reusable team', async () => {
    mocks.periodTeam.findUnique.mockResolvedValue(periodTeamFixture());
    mocks.periodTeam.update.mockResolvedValue({
      ...periodTeamFixture(),
      name: 'Crimson Team',
    });

    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/period-teams/period_team_1',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Crimson Team' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('Crimson Team');
  });

  it('prevents deleting a reusable team already copied into a party', async () => {
    mocks.periodTeam.findUnique.mockResolvedValue(periodTeamFixture({ partyTeamCount: 1 }));

    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/period-teams/period_team_1',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(409);
    expect(mocks.periodTeam.delete).not.toHaveBeenCalled();
  });

  it('deletes an unused reusable team', async () => {
    mocks.periodTeam.findUnique.mockResolvedValue(periodTeamFixture());
    mocks.periodTeam.delete.mockResolvedValue({});

    const res = await app.inject({
      method: 'DELETE',
      url: '/v1/period-teams/period_team_1',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(204);
    expect(mocks.periodTeam.delete).toHaveBeenCalledWith({ where: { id: 'period_team_1' } });
  });
});
