-- CreateTable
CREATE TABLE "Trait" (
    "Id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "required" TEXT NOT NULL,
    "possible" TEXT NOT NULL,
    "career" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "charVariant" TEXT NOT NULL,
    "boffVariant" TEXT NOT NULL,
    "doffVariant" TEXT NOT NULL,
    "iconName" TEXT NOT NULL,
    "master" TEXT NOT NULL,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trait_pkey" PRIMARY KEY ("Id")
);
