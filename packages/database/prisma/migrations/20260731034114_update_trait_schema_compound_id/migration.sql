/*
  Warnings:

  - A unique constraint covering the columns `[name,type,environment]` on the table `Trait` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Trait_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Trait_name_type_environment_key" ON "Trait"("name", "type", "environment");
