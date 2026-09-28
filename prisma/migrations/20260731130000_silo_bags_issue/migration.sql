-- Split staged items into pallet-size bags; link staging to its Issue for clean delete.
ALTER TABLE "SiloStaging" ADD COLUMN "palletSize" DOUBLE PRECISION;
ALTER TABLE "SiloStaging" ADD COLUMN "issueId" TEXT;
ALTER TABLE "SiloLoad" ADD COLUMN "bagNo" INTEGER;
