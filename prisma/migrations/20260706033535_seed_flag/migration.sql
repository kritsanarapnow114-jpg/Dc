-- CreateTable
CREATE TABLE "SeedFlag" (
    "key" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedFlag_pkey" PRIMARY KEY ("key")
);
