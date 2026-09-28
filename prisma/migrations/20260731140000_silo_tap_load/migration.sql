-- Machine chosen at stage time; tap-to-start/finish loading (loadedAt now nullable).
ALTER TABLE "SiloStaging" ADD COLUMN "machine" TEXT;
ALTER TABLE "SiloLoad" ADD COLUMN "startedAt" TIMESTAMP(3);
ALTER TABLE "SiloLoad" ALTER COLUMN "loadedAt" DROP NOT NULL;
