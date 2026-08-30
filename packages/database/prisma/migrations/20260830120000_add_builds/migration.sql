-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "publicCode" TEXT NOT NULL,
    "editTokenHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shipName" TEXT NOT NULL,
    "shipId" INTEGER,
    "payload" JSONB NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "contentHash" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'unlisted',
    "listedAt" TIMESTAMP(3),
    "listIpHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildFill" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "catalogKind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT '',
    "shipName" TEXT NOT NULL,

    CONSTRAINT "BuildFill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildFeatured" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "buildId" TEXT NOT NULL,

    CONSTRAINT "BuildFeatured_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Build_publicCode_key" ON "Build"("publicCode");

-- CreateIndex
CREATE INDEX "Build_visibility_idx" ON "Build"("visibility");

-- CreateIndex
CREATE INDEX "Build_shipName_idx" ON "Build"("shipName");

-- CreateIndex
CREATE INDEX "Build_contentHash_idx" ON "Build"("contentHash");

-- CreateIndex
CREATE INDEX "Build_listIpHash_listedAt_idx" ON "Build"("listIpHash", "listedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BuildFill_buildId_catalogKind_name_type_key" ON "BuildFill"("buildId", "catalogKind", "name", "type");

-- CreateIndex
CREATE INDEX "BuildFill_name_catalogKind_idx" ON "BuildFill"("name", "catalogKind");

-- CreateIndex
CREATE INDEX "BuildFill_shipName_idx" ON "BuildFill"("shipName");

-- CreateIndex
CREATE INDEX "BuildFill_contentHash_idx" ON "BuildFill"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "BuildFeatured_date_key" ON "BuildFeatured"("date");

-- CreateIndex
CREATE INDEX "BuildFeatured_buildId_idx" ON "BuildFeatured"("buildId");

-- AddForeignKey
ALTER TABLE "BuildFill" ADD CONSTRAINT "BuildFill_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildFeatured" ADD CONSTRAINT "BuildFeatured_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;
