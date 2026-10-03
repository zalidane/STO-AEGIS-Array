-- CatalogSupplement holds Cargo corrections that must survive without a repo update.
-- kind selects the Cargo table; payload is the Cargo-shaped record merged on import.

CREATE TABLE "CatalogSupplement" (
    "id" SERIAL NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT '',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogSupplement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogSupplement_kind_key_variant_key" ON "CatalogSupplement"("kind", "key", "variant");

CREATE INDEX "CatalogSupplement_kind_idx" ON "CatalogSupplement"("kind");

-- Modifier gaps (#11). Cargo stays the import source; these rows are merged on import.
-- [HullCap], [ShCap], and [ShdHeal] exist only inside combo tokens.
-- [HullHeal] is present but its item allowlist hides it on most deflectors.
-- [Proc] omits Ship Fore Weapon (#10). Abbreviated combo halves ([Ac], [Dm], [Sh], …)
-- are not seeded: their standalone tokens already exist under the full name.
INSERT INTO "CatalogSupplement" ("kind", "key", "variant", "payload", "updatedAt")
VALUES
  (
    'Modifiers',
    '[HullCap]',
    '',
    $supp${"modifier":"[HullCap]","stats":"+__ Starship Hull Capacity","type":"Ship Deflector Dish,Ship Secondary Deflector","available":null,"isunique":"1","isepic":"0","info":"Supplement: standalone Hull Capacity (wiki Cargo only publishes combo tokens such as [HullCap/DrainX])."}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Modifiers',
    '[ShCap]',
    '',
    $supp${"modifier":"[ShCap]","stats":"+__ Starship Shield Capacity","type":"Ship Deflector Dish,Ship Secondary Deflector","available":null,"isunique":"1","isepic":"0","info":"Supplement: standalone Shield Capacity (wiki Cargo only publishes combo tokens such as [ShCap/CtrlX])."}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Modifiers',
    '[ShdHeal]',
    '',
    $supp${"modifier":"[ShdHeal]","stats":"+__ Starship Shield Restoration","type":"Ship Deflector Dish,Ship Secondary Deflector","available":null,"isunique":"1","isepic":"0","info":"Supplement: standalone Shield Restoration (wiki Cargo only publishes combo tokens such as [CtrlX/ShdHeal])."}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Modifiers',
    '[HullHeal]',
    '',
    $supp${"modifier":"[HullHeal]","stats":"+__ Starship Hull Restoration","type":"Ship Deflector Dish","available":null,"isunique":"1","isepic":"0","info":null,"_merge":{"clearAvailable":true}}$supp$::jsonb,
    CURRENT_TIMESTAMP
  ),
  (
    'Modifiers',
    '[Proc]',
    '',
    $supp${"modifier":"[Proc]","stats":null,"type":"Body Armor,EV Suit,Ground Weapon,Kit,Personal Shield,Ship Aft Weapon,Ship Weapon,Ship Fore Weapon","available":null,"isunique":"1","isepic":"0","info":"Supplement: wiki Type omits Ship Fore Weapon; Terran Task Force Dual Heavy Cannons and other fore weapons need [Proc] (#10)."}$supp$::jsonb,
    CURRENT_TIMESTAMP
  );
