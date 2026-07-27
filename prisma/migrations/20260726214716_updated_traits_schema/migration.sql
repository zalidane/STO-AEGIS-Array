/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Trait` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Trait_name_key" ON "Trait"("name");
