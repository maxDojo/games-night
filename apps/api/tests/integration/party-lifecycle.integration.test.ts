import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const runIntegration = process.env.INTEGRATION_TEST_DATABASE_URL
  ? describe
  : describe.skip;

runIntegration('api integration: party lifecycle', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let userId: string | undefined;
  let partyId: string | undefined;

  beforeAll(async () => {
    const { buildApp } = await import('../../src/app.js');

    prisma = new PrismaClient();
    await prisma.$connect();

    app = await buildApp({ prisma, disableSockets: true });
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();

    if (prisma) {
      if (partyId) {
        await prisma.party.deleteMany({ where: { id: partyId } });
      }
      if (userId) {
        await prisma.user.deleteMany({ where: { id: userId } });
      }
      await prisma.$disconnect();
    }
  });

  it('checks DB readiness and runs a host/team/player lifecycle against Postgres', async () => {
    const ready = await app.inject({ method: 'GET', url: '/v1/ready' });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ status: 'ready' });

    const email = `integration-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
    const register = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email,
        displayName: 'Integration Host',
        password: 'integration-password',
      },
    });

    expect(register.statusCode).toBe(201);
    const authBody = register.json<{
      user: { id: string; email: string };
      token: string;
    }>();
    userId = authBody.user.id;
    expect(authBody.user.email).toBe(email);
    expect(authBody.token).toMatch(/^eyJ/);

    const createParty = await app.inject({
      method: 'POST',
      url: '/v1/parties',
      headers: { authorization: `Bearer ${authBody.token}` },
      payload: {
        name: 'Integration Night',
        maxTeams: 4,
        maxPerTeam: 5,
      },
    });

    expect(createParty.statusCode).toBe(201);
    const party = createParty.json<{
      id: string;
      joinCode: string;
      hostId: string;
      status: string;
    }>();
    partyId = party.id;
    expect(party.hostId).toBe(userId);
    expect(party.joinCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(party.status).toBe('LOBBY');

    const createTeam = await app.inject({
      method: 'POST',
      url: `/v1/parties/${party.joinCode}/teams`,
      headers: { authorization: `Bearer ${authBody.token}` },
      payload: { name: 'Red Team', color: '#ff0000' },
    });

    expect(createTeam.statusCode).toBe(201);
    const team = createTeam.json<{
      id: string;
      partyId: string;
      position: number;
    }>();
    expect(team.partyId).toBe(party.id);
    expect(team.position).toBe(1);

    const joinTeam = await app.inject({
      method: 'POST',
      url: `/v1/teams/${team.id}/players`,
      payload: { nickname: 'Anon Player' },
    });

    expect(joinTeam.statusCode).toBe(201);
    const player = joinTeam.json<{
      id: string;
      teamId: string;
      nickname: string;
      isCaptain: boolean;
    }>();
    expect(player.teamId).toBe(team.id);
    expect(player.nickname).toBe('Anon Player');
    expect(player.isCaptain).toBe(true);

    const fetchedParty = await app.inject({
      method: 'GET',
      url: `/v1/parties/${party.joinCode}`,
    });

    expect(fetchedParty.statusCode).toBe(200);
    const partyState = fetchedParty.json<{
      id: string;
      teams: Array<{ id: string; players: Array<{ id: string }> }>;
    }>();
    expect(partyState.id).toBe(party.id);
    expect(partyState.teams).toHaveLength(1);
    expect(partyState.teams[0]?.id).toBe(team.id);
    expect(partyState.teams[0]?.players[0]?.id).toBe(player.id);

    const teams = await app.inject({
      method: 'GET',
      url: `/v1/parties/${party.joinCode}/teams`,
    });

    expect(teams.statusCode).toBe(200);
    expect(teams.json<Array<{ id: string }>>()).toEqual([
      expect.objectContaining({ id: team.id }),
    ]);
  });
});
