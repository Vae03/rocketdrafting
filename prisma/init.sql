PRAGMA foreign_keys = ON;

CREATE TABLE "Season" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceUrl" TEXT,
  "sourcedAt" DATETIME
);

CREATE TABLE "Organization" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "region" TEXT NOT NULL
);

CREATE TABLE "Person" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "handle" TEXT NOT NULL UNIQUE,
  "fullName" TEXT,
  "country" TEXT,
  "photoUrl" TEXT
);

CREATE TABLE "Roster" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "seasonId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "placement" INTEGER NOT NULL,
  "rankingPoints" INTEGER,
  "sourceUrl" TEXT,
  "sourcedAt" DATETIME,
  CONSTRAINT "Roster_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Roster_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Roster_seasonId_organizationId_key" UNIQUE ("seasonId", "organizationId")
);

CREATE TABLE "RosterMember" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "rosterId" TEXT NOT NULL,
  "personId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  CONSTRAINT "RosterMember_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "Roster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RosterMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "RosterMember_rosterId_personId_role_key" UNIQUE ("rosterId", "personId", "role")
);

CREATE TABLE "UserProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userKey" TEXT NOT NULL UNIQUE,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "level" INTEGER NOT NULL DEFAULT 1,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);
