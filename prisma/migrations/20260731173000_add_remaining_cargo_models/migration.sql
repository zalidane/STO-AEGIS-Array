-- CreateTable
CREATE TABLE "GwObtain" (
    "id" SERIAL NOT NULL,
    "cat" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "flavor" TEXT NOT NULL,
    "box" TEXT,
    "lb" TEXT,
    "rep" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GwObtain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwObtain" (
    "id" SERIAL NOT NULL,
    "cat" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "flavor" TEXT NOT NULL,
    "box" TEXT,
    "lb" TEXT,
    "rep" TEXT,
    "ships" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwObtain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modifier" (
    "id" SERIAL NOT NULL,
    "modifier" TEXT NOT NULL,
    "stats" TEXT,
    "type" TEXT NOT NULL,
    "available" TEXT,
    "isunique" BOOLEAN NOT NULL DEFAULT false,
    "isepic" BOOLEAN NOT NULL DEFAULT false,
    "info" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Modifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reputation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color1" TEXT,
    "color2" TEXT,
    "icon" TEXT,
    "link" TEXT,
    "description" TEXT,
    "released" TEXT,
    "environment" TEXT,
    "boff" BOOLEAN,
    "secondary" BOOLEAN,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetBonus" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "setPage" TEXT,
    "reqItems" INTEGER,
    "passives" TEXT,
    "traySkills" TEXT,
    "procs" TEXT,
    "abilities" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraySkill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "system" TEXT,
    "description" TEXT,
    "descriptionLong" TEXT,
    "targets" TEXT,
    "affects" TEXT,
    "activation" TEXT,
    "rechargeBase" INTEGER,
    "rechargeGlobal" INTEGER,
    "type" TEXT,
    "region" TEXT,
    "rank1rank" TEXT,
    "rank2rank" TEXT,
    "rank3rank" TEXT,
    "rank4rank" TEXT,
    "rank5rank" TEXT,
    "rank1info" TEXT,
    "rank2info" TEXT,
    "rank3info" TEXT,
    "rank4info" TEXT,
    "rank5info" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraySkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Infobox" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT,
    "type" TEXT,
    "boundto" TEXT,
    "boundwhen" TEXT,
    "who" TEXT,
    "head1" TEXT,
    "head2" TEXT,
    "head3" TEXT,
    "head4" TEXT,
    "head5" TEXT,
    "head6" TEXT,
    "head7" TEXT,
    "head8" TEXT,
    "head9" TEXT,
    "subhead1" TEXT,
    "subhead2" TEXT,
    "subhead3" TEXT,
    "subhead4" TEXT,
    "subhead5" TEXT,
    "subhead6" TEXT,
    "subhead7" TEXT,
    "subhead8" TEXT,
    "subhead9" TEXT,
    "text1" TEXT,
    "text2" TEXT,
    "text3" TEXT,
    "text4" TEXT,
    "text5" TEXT,
    "text6" TEXT,
    "text7" TEXT,
    "text8" TEXT,
    "text9" TEXT,
    "equiplimit" INTEGER,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Infobox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mastery" (
    "id" SERIAL NOT NULL,
    "masterytype" TEXT NOT NULL,
    "shiptype" TEXT NOT NULL,
    "shipfaction" TEXT NOT NULL,
    "masterypackage" TEXT NOT NULL,
    "trait" TEXT,
    "traitdesc" TEXT,
    "trait2" TEXT,
    "traitdesc2" TEXT,
    "trait3" TEXT,
    "traitdesc3" TEXT,
    "acctrait" TEXT,
    "acctraitdesc" TEXT,
    "rawData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mastery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GwObtain_cat_type_flavor_key" ON "GwObtain"("cat", "type", "flavor");

-- CreateIndex
CREATE UNIQUE INDEX "SwObtain_cat_type_flavor_key" ON "SwObtain"("cat", "type", "flavor");

-- CreateIndex
CREATE UNIQUE INDEX "Modifier_modifier_type_key" ON "Modifier"("modifier", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Reputation_name_key" ON "Reputation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SetBonus_name_key" ON "SetBonus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TraySkill_name_key" ON "TraySkill"("name");

-- CreateIndex
CREATE INDEX "Infobox_name_idx" ON "Infobox"("name");

-- CreateIndex
CREATE INDEX "Mastery_masterypackage_masterytype_shiptype_shipfaction_idx" ON "Mastery"("masterypackage", "masterytype", "shiptype", "shipfaction");
