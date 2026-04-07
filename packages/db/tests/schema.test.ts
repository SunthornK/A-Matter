import { describe, it, expect, afterAll } from 'vitest'
import { prisma } from '../src/client'

const testIds: { users: string[]; rooms: string[]; games: string[] } = {
  users: [],
  rooms: [],
  games: [],
}

afterAll(async () => {
  await prisma.move.deleteMany({ where: { gameId: { in: testIds.games } } })
  await prisma.gamePlayer.deleteMany({ where: { gameId: { in: testIds.games } } })
  await prisma.game.deleteMany({ where: { id: { in: testIds.games } } })
  await prisma.room.deleteMany({ where: { id: { in: testIds.rooms } } })
  await prisma.user.deleteMany({ where: { id: { in: testIds.users } } })
  await prisma.$disconnect()
})

async function createTestUser(suffix: string) {
  const user = await prisma.user.create({
    data: {
      username: `testuser_${suffix}`,
      email: `test_${suffix}@example.com`,
      passwordHash: 'hashed',
      displayName: `Test User ${suffix}`,
    },
  })
  testIds.users.push(user.id)
  return user
}

describe('users table', () => {
  it('creates a user with default Glicko-2 values', async () => {
    const user = await createTestUser('glicko')
    expect(user.glickoRating).toBe(1500.0)
    expect(user.glickoRd).toBe(350.0)
    expect(user.glickoVolatility).toBe(0.06)
    expect(user.role).toBe('user')
    expect(user.tokenVersion).toBe(0)
    expect(user.gamesPlayed).toBe(0)
    expect(user.gamesWon).toBe(0)
  })

  it('enforces unique username', async () => {
    await createTestUser('uniq1')
    await expect(
      prisma.user.create({
        data: {
          username: 'testuser_uniq1',
          email: 'other_uniq1@example.com',
          passwordHash: 'hashed',
          displayName: 'Dupe',
        },
      }),
    ).rejects.toThrow()
  })

  it('enforces unique email', async () => {
    await createTestUser('uniq2')
    await expect(
      prisma.user.create({
        data: {
          username: 'completely_different',
          email: 'test_uniq2@example.com',
          passwordHash: 'hashed',
          displayName: 'Dupe Email',
        },
      }),
    ).rejects.toThrow()
  })
})

describe('rooms table', () => {
  it('creates a room with default status waiting and 22min timer', async () => {
    const room = await prisma.room.create({
      data: {
        type: 'private',
        inviteCode: 'TST001',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    testIds.rooms.push(room.id)
    expect(room.status).toBe('waiting')
    expect(room.timePerSideMs).toBe(1320000)
  })

  it('allows room creation without inviteCode', async () => {
    const room = await prisma.room.create({
      data: {
        type: 'quickplay',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    testIds.rooms.push(room.id)
    expect(room.inviteCode).toBeNull()
    expect(room.status).toBe('waiting')
  })

  it('enforces unique invite_code', async () => {
    const room = await prisma.room.create({
      data: {
        type: 'private',
        inviteCode: 'DUP001',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    testIds.rooms.push(room.id)

    await expect(
      prisma.room.create({
        data: {
          type: 'private',
          inviteCode: 'DUP001',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      }),
    ).rejects.toThrow()
  })
})

describe('game_players table', () => {
  it('enforces unique (game_id, seat) constraint', async () => {
    const room = await prisma.room.create({
      data: {
        type: 'quickplay',
        status: 'in_game',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    testIds.rooms.push(room.id)

    const game = await prisma.game.create({
      data: {
        roomId: room.id,
        mode: 'quickplay',
        boardState: { cells: [] },
        tileBag: [],
      },
    })
    testIds.games.push(game.id)

    await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        seat: 1,
        rack: [],
        timeRemainingMs: 1320000,
        guestToken: 'seat-test-1',
      },
    })

    await expect(
      prisma.gamePlayer.create({
        data: {
          gameId: game.id,
          seat: 1,
          rack: [],
          timeRemainingMs: 1320000,
          guestToken: 'seat-test-2',
        },
      }),
    ).rejects.toThrow()
  })

  it('defaults: score=0, consecutivePasses=0, tileTracker=[]', async () => {
    const room = await prisma.room.create({
      data: {
        type: 'quickplay',
        status: 'in_game',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    testIds.rooms.push(room.id)

    const game = await prisma.game.create({
      data: {
        roomId: room.id,
        mode: 'quickplay',
        boardState: { cells: [] },
        tileBag: [],
      },
    })
    testIds.games.push(game.id)

    const player = await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        seat: 1,
        rack: [],
        timeRemainingMs: 1320000,
        guestToken: 'defaults-test',
      },
    })

    expect(player.score).toBe(0)
    expect(player.consecutivePasses).toBe(0)
    expect(player.tileTracker).toEqual([])
  })
})

describe('moves table', () => {
  it('creates a pass move with scoreEarned=0 default', async () => {
    const room = await prisma.room.create({
      data: {
        type: 'quickplay',
        status: 'in_game',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })
    testIds.rooms.push(room.id)

    const game = await prisma.game.create({
      data: {
        roomId: room.id,
        mode: 'quickplay',
        boardState: { cells: [] },
        tileBag: [],
      },
    })
    testIds.games.push(game.id)

    const player = await prisma.gamePlayer.create({
      data: {
        gameId: game.id,
        seat: 1,
        rack: [],
        timeRemainingMs: 1320000,
        guestToken: 'move-test',
      },
    })

    const move = await prisma.move.create({
      data: {
        gameId: game.id,
        playerId: player.id,
        turnNumber: 1,
        action: 'pass',
        scoreEarned: 0,
        timeSpentMs: 10000,
      },
    })

    expect(move.action).toBe('pass')
    expect(move.scoreEarned).toBe(0)
    expect(move.placements).toBeNull()
    expect(move.equations).toBeNull()
  })
})
