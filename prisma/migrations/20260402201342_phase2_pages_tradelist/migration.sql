-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_binder_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "binderId" TEXT NOT NULL,
    "pageId" TEXT,
    "tcgApiId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "setName" TEXT NOT NULL,
    "collectorNumber" TEXT NOT NULL,
    "rarity" TEXT,
    "imageUrl" TEXT,
    "priceLow" REAL,
    "priceMid" REAL,
    "priceMarket" REAL,
    "priceHigh" REAL,
    "priceUpdatedAt" DATETIME,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition" TEXT,
    "tradeList" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "binder_cards_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "binders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "binder_cards_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_binder_cards" ("binderId", "collectorNumber", "condition", "createdAt", "id", "imageUrl", "name", "pageId", "priceHigh", "priceLow", "priceMarket", "priceMid", "priceUpdatedAt", "quantity", "rarity", "setId", "setName", "tcgApiId", "updatedAt") SELECT "binderId", "collectorNumber", "condition", "createdAt", "id", "imageUrl", "name", "pageId", "priceHigh", "priceLow", "priceMarket", "priceMid", "priceUpdatedAt", "quantity", "rarity", "setId", "setName", "tcgApiId", "updatedAt" FROM "binder_cards";
DROP TABLE "binder_cards";
ALTER TABLE "new_binder_cards" RENAME TO "binder_cards";
CREATE TABLE "new_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "binderId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL DEFAULT '',
    "imagePath" TEXT NOT NULL,
    "rawAiOutput" TEXT,
    "processedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pages_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "binders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_pages" ("binderId", "createdAt", "id", "imagePath", "pageNumber", "processedAt", "rawAiOutput", "status") SELECT "binderId", "createdAt", "id", "imagePath", "pageNumber", "processedAt", "rawAiOutput", "status" FROM "pages";
DROP TABLE "pages";
ALTER TABLE "new_pages" RENAME TO "pages";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
