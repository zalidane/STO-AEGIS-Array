-- CreateTable
CREATE TABLE "StarshipTrait" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "short" TEXT,
    "type" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StarshipTrait_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StarshipTrait_name_key" ON "StarshipTrait"("name");
