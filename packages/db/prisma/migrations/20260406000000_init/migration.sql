-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('ranked', 'quickplay', 'private');

-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('waiting', 'full', 'in_game', 'closed');

-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('ranked', 'quickplay', 'private');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('active', 'finished');

-- CreateEnum
CREATE TYPE "EndReason" AS ENUM ('completion', 'timeout', 'forfeit', 'stalemate');

-- CreateEnum
CREATE TYPE "MoveAction" AS ENUM ('place', 'exchange', 'pass');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'user',
    "displayName" VARCHAR(50) NOT NULL,
    "country" CHAR(2),
    "avatarUrl" TEXT,
    "glickoRating" DOUBLE PRECISION NOT NULL DEFAULT 1500.0,
    "glickoRd" DOUBLE PRECISION NOT NULL DEFAULT 350.0,
    "glickoVolatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creatorId" UUID,
    "inviteCode" CHAR(6),
    "type" "RoomType" NOT NULL,
    "timePerSideMs" INTEGER NOT NULL DEFAULT 1320000,
    "status" "RoomStatus" NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "roomId" UUID NOT NULL,
    "mode" "GameMode" NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'active',
    "boardState" JSONB NOT NULL,
    "tileBag" JSONB NOT NULL,
    "turnNumber" INTEGER NOT NULL DEFAULT 1,
    "currentTurnPlayerId" UUID,
    "endReason" "EndReason",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_players" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gameId" UUID NOT NULL,
    "userId" UUID,
    "guestToken" VARCHAR(64),
    "seat" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "rack" JSONB NOT NULL,
    "timeRemainingMs" INTEGER NOT NULL,
    "consecutivePasses" INTEGER NOT NULL DEFAULT 0,
    "tileTracker" JSONB NOT NULL DEFAULT '[]',
    "lastExchangeAt" TIMESTAMP(3),

    CONSTRAINT "game_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moves" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "gameId" UUID NOT NULL,
    "playerId" UUID NOT NULL,
    "turnNumber" INTEGER NOT NULL,
    "action" "MoveAction" NOT NULL,
    "placements" JSONB,
    "equations" JSONB,
    "exchangedIndices" JSONB,
    "scoreEarned" INTEGER NOT NULL DEFAULT 0,
    "timeSpentMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_inviteCode_key" ON "rooms"("inviteCode");

-- CreateIndex
CREATE INDEX "rooms_status_type_idx" ON "rooms"("status", "type");

-- CreateIndex
CREATE INDEX "rooms_creatorId_idx" ON "rooms"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "games_roomId_key" ON "games"("roomId");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_roomId_idx" ON "games"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "game_players_gameId_seat_key" ON "game_players"("gameId", "seat");

-- CreateIndex
CREATE INDEX "game_players_gameId_idx" ON "game_players"("gameId");

-- CreateIndex
CREATE INDEX "game_players_userId_idx" ON "game_players"("userId");

-- CreateIndex
CREATE INDEX "moves_gameId_turnNumber_idx" ON "moves"("gameId", "turnNumber");

-- CreateIndex
CREATE INDEX "moves_gameId_idx" ON "moves"("gameId");

-- CreateIndex
CREATE INDEX "moves_playerId_idx" ON "moves"("playerId");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moves" ADD CONSTRAINT "moves_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moves" ADD CONSTRAINT "moves_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "game_players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
