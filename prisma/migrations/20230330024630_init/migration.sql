-- CreateTable
CREATE TABLE "GuildOptions" (
    "guildId" TEXT NOT NULL PRIMARY KEY,
    "gambleChance" DECIMAL NOT NULL DEFAULT 33.33,
    "globalDuelCD" INTEGER NOT NULL DEFAULT 60000,
    "lastDuel" DATETIME NOT NULL DEFAULT 0,
    "lastRPG" DATETIME NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "favColor" TEXT,
    "lastRandom" DATETIME NOT NULL DEFAULT 0,
    "lastLoss" DATETIME NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Duels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "winStreak" INTEGER NOT NULL DEFAULT 0,
    "lossStreak" INTEGER NOT NULL DEFAULT 0,
    "winStreakMax" INTEGER NOT NULL DEFAULT 0,
    "lossStreakMax" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Duels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BestMixu" (
    "id" TEXT NOT NULL DEFAULT '1',
    "owner" TEXT NOT NULL DEFAULT '',
    "tiles" TEXT NOT NULL DEFAULT '',
    "score" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "RPGCharacter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "lastLoss" DATETIME NOT NULL DEFAULT 0,
    "eloRank" INTEGER NOT NULL DEFAULT 1000,
    "peakElo" INTEGER NOT NULL DEFAULT 1000,
    "floorElo" INTEGER NOT NULL DEFAULT 1000
);

-- CreateTable
CREATE TABLE "NFDItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "discordUrl" TEXT NOT NULL DEFAULT '',
    "mintDate" DATETIME NOT NULL DEFAULT 0,
    "previousOwners" TEXT NOT NULL DEFAULT '',
    "coveters" TEXT NOT NULL DEFAULT '',
    "shunners" TEXT NOT NULL DEFAULT '',
    "hotness" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "NFDEnjoyer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mintCount" INTEGER NOT NULL DEFAULT 0,
    "lastMint" DATETIME NOT NULL DEFAULT 0,
    "lastGiftGiven" DATETIME NOT NULL DEFAULT 0,
    "lastSlurp" DATETIME NOT NULL DEFAULT 0,
    "consecutiveFails" INTEGER NOT NULL DEFAULT 4,
    "successfulMints" INTEGER NOT NULL DEFAULT 0,
    "failedMints" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "NFDEnthusiasts" (
    "dinoId" INTEGER NOT NULL,
    "enjoyerId" TEXT NOT NULL,

    PRIMARY KEY ("dinoId", "enjoyerId"),
    CONSTRAINT "NFDEnthusiasts_dinoId_fkey" FOREIGN KEY ("dinoId") REFERENCES "NFDItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NFDEnthusiasts_enjoyerId_fkey" FOREIGN KEY ("enjoyerId") REFERENCES "NFDEnjoyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildOptions_guildId_key" ON "GuildOptions"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "User_id_key" ON "User"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BestMixu_id_key" ON "BestMixu"("id");

-- CreateIndex
CREATE UNIQUE INDEX "RPGCharacter_id_key" ON "RPGCharacter"("id");

-- CreateIndex
CREATE UNIQUE INDEX "NFDItem_name_key" ON "NFDItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "NFDItem_code_key" ON "NFDItem"("code");

-- CreateIndex
CREATE UNIQUE INDEX "NFDItem_filename_key" ON "NFDItem"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "NFDEnjoyer_id_key" ON "NFDEnjoyer"("id");
