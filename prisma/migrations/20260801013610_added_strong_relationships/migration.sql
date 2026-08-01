-- AlterTable
ALTER TABLE "GwObtain" ADD COLUMN     "lockBoxId" INTEGER;

-- AlterTable
ALTER TABLE "Mastery" ADD COLUMN     "acctraitId" INTEGER,
ADD COLUMN     "shipTypeId" INTEGER,
ADD COLUMN     "trait2Id" INTEGER,
ADD COLUMN     "trait3Id" INTEGER,
ADD COLUMN     "traitId" INTEGER;

-- AlterTable
ALTER TABLE "Ship" ADD COLUMN     "shipTypeId" INTEGER,
ADD COLUMN     "uniconsole" TEXT,
ADD COLUMN     "uniconsoleId" INTEGER;

-- AlterTable
ALTER TABLE "SwObtain" ADD COLUMN     "lockBoxId" INTEGER;

-- CreateTable
CREATE TABLE "StarshipTraitShip" (
    "starshipTraitId" INTEGER NOT NULL,
    "shipId" INTEGER NOT NULL,

    CONSTRAINT "StarshipTraitShip_pkey" PRIMARY KEY ("starshipTraitId","shipId")
);

-- CreateTable
CREATE TABLE "ShipType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ShipType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModifierItem" (
    "modifierId" INTEGER NOT NULL,
    "infoboxId" INTEGER NOT NULL,

    CONSTRAINT "ModifierItem_pkey" PRIMARY KEY ("modifierId","infoboxId")
);

-- CreateIndex
CREATE INDEX "StarshipTraitShip_shipId_idx" ON "StarshipTraitShip"("shipId");

-- CreateIndex
CREATE UNIQUE INDEX "ShipType_name_key" ON "ShipType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ModifierItem_modifierId_infoboxId_key" ON "ModifierItem"("modifierId", "infoboxId");

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_shipTypeId_fkey" FOREIGN KEY ("shipTypeId") REFERENCES "ShipType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_uniconsoleId_fkey" FOREIGN KEY ("uniconsoleId") REFERENCES "Infobox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GwObtain" ADD CONSTRAINT "GwObtain_lockBoxId_fkey" FOREIGN KEY ("lockBoxId") REFERENCES "Infobox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwObtain" ADD CONSTRAINT "SwObtain_lockBoxId_fkey" FOREIGN KEY ("lockBoxId") REFERENCES "Infobox"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mastery" ADD CONSTRAINT "Mastery_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "StarshipTrait"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mastery" ADD CONSTRAINT "Mastery_trait2Id_fkey" FOREIGN KEY ("trait2Id") REFERENCES "StarshipTrait"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mastery" ADD CONSTRAINT "Mastery_trait3Id_fkey" FOREIGN KEY ("trait3Id") REFERENCES "StarshipTrait"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mastery" ADD CONSTRAINT "Mastery_acctraitId_fkey" FOREIGN KEY ("acctraitId") REFERENCES "StarshipTrait"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mastery" ADD CONSTRAINT "Mastery_shipTypeId_fkey" FOREIGN KEY ("shipTypeId") REFERENCES "ShipType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarshipTraitShip" ADD CONSTRAINT "StarshipTraitShip_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "Ship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StarshipTraitShip" ADD CONSTRAINT "StarshipTraitShip_starshipTraitId_fkey" FOREIGN KEY ("starshipTraitId") REFERENCES "StarshipTrait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierItem" ADD CONSTRAINT "ModifierItem_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "Modifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModifierItem" ADD CONSTRAINT "ModifierItem_infoboxId_fkey" FOREIGN KEY ("infoboxId") REFERENCES "Infobox"("id") ON DELETE CASCADE ON UPDATE CASCADE;
