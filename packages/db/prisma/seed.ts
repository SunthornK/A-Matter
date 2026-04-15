import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create two test users with upsert (safe to re-run)
  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: { role: 'admin' },
    create: {
      username: 'alice',
      email: 'alice@example.com',
      role: 'admin',
      // bcrypt hash of 'password123' — dev only
      passwordHash: '$2b$10$Qnc/LVYjnCLCiuVMpKUHveT8EGlxIwAkF8lZ7C3KvDfhiQaHv3eCu',
      displayName: 'Alice (Admin)',
      country: 'TH',
      glickoRating: 1600.0,
      glickoRd: 150.0,
      gamesPlayed: 30,
      gamesWon: 18,
    },
  })

  const bob = await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      username: 'bob',
      email: 'bob@example.com',
      passwordHash: '$2b$10$Qnc/LVYjnCLCiuVMpKUHveT8EGlxIwAkF8lZ7C3KvDfhiQaHv3eCu',
      displayName: 'Bob',
      country: 'US',
      glickoRating: 1450.0,
      glickoRd: 200.0,
      gamesPlayed: 15,
      gamesWon: 6,
    },
  })

  console.log(`Users: alice (${alice.id}), bob (${bob.id})`)

  // Create a finished ranked game (stalemate)
  const room = await prisma.room.create({
    data: {
      creatorId: alice.id,
      type: 'ranked',
      status: 'closed',
      expiresAt: new Date(Date.now() + 1000),
    },
  })

  const emptyBoard = {
    cells: Array.from({ length: 15 }, () => Array(15).fill(null)),
  }

  const game = await prisma.game.create({
    data: {
      roomId: room.id,
      mode: 'ranked',
      status: 'finished',
      boardState: emptyBoard,
      tileBag: [],
      turnNumber: 7,
      endReason: 'stalemate',
      finishedAt: new Date(),
    },
  })

  const player1 = await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      userId: alice.id,
      seat: 1,
      score: 72,
      rack: [],
      timeRemainingMs: 900000,
    },
  })

  const player2 = await prisma.gamePlayer.create({
    data: {
      gameId: game.id,
      userId: bob.id,
      seat: 2,
      score: 55,
      rack: [],
      timeRemainingMs: 1100000,
    },
  })

  // 6 pass moves (3 each) → stalemate
  for (let turn = 1; turn <= 6; turn++) {
    const playerId = turn % 2 === 1 ? player1.id : player2.id
    await prisma.move.create({
      data: {
        gameId: game.id,
        playerId,
        turnNumber: turn,
        action: 'pass',
        scoreEarned: 0,
        timeSpentMs: 3000,
      },
    })
  }

  console.log(`Game ${game.id} — stalemate, alice 72 vs bob 55`)
  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
