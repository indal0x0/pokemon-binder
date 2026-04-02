-- CreateTable
CREATE TABLE "binders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "binderId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imagePath" TEXT NOT NULL,
    "rawAiOutput" TEXT,
    "processedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pages_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "binders" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "binder_cards" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "binder_cards_binderId_fkey" FOREIGN KEY ("binderId") REFERENCES "binders" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "binder_cards_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
