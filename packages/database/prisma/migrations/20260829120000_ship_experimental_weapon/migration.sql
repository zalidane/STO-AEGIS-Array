-- AlterTable
ALTER TABLE "Ship" ADD COLUMN "experimentalWeapon" TEXT,
ADD COLUMN "experimentalWeaponId" INTEGER;

-- AddForeignKey
ALTER TABLE "Ship" ADD CONSTRAINT "Ship_experimentalWeaponId_fkey" FOREIGN KEY ("experimentalWeaponId") REFERENCES "Infobox"("id") ON DELETE SET NULL ON UPDATE CASCADE;
