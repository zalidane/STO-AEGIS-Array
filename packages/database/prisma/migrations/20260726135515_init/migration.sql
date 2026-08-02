-- CreateTable
CREATE TABLE "Ship" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tier" INTEGER,
    "type" TEXT,
    "hull" TEXT,
    "hullMod" DOUBLE PRECISION,
    "shieldMod" DOUBLE PRECISION,
    "turnRate" DOUBLE PRECISION,
    "impulse" DOUBLE PRECISION,
    "inertia" INTEGER,
    "foreWeapons" INTEGER,
    "aftWeapons" INTEGER,
    "tacticalSlots" INTEGER,
    "engineeringSlots" INTEGER,
    "scienceSlots" INTEGER,
    "secondaryDeflector" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ship_name_key" ON "Ship"("name");
