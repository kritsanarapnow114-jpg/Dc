-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "containerType" TEXT NOT NULL DEFAULT 'OTHER';

-- Seed a best-guess container type from each product's name / unit / category.
-- These are only initial guesses — they can be corrected per product in the UI.
UPDATE "Product" SET "containerType" = CASE
  WHEN lower("nameEn") LIKE '%ibc%' OR lower(coalesce("nameTh", '')) LIKE '%ibc%' THEN 'IBC'
  WHEN lower("nameEn") LIKE '%octabin%' OR lower("nameEn") LIKE '%octabbin%' OR lower(coalesce("nameTh", '')) LIKE '%ออคตา%' THEN 'OCTABIN'
  WHEN lower("nameEn") LIKE '%drum%' OR lower(coalesce("nameTh", '')) LIKE '%ถังกลม%' THEN 'DRUM'
  WHEN lower("nameEn") LIKE '%supersack%' OR lower("nameEn") LIKE '%super sack%' OR lower("nameEn") LIKE '%jumbo%' OR lower("nameEn") LIKE '%big bag%' OR lower(coalesce("nameTh", '')) LIKE '%ซุปเปอร์แซค%' THEN 'SUPERSACK'
  WHEN lower("nameEn") LIKE '%bag%' OR lower("nameEn") LIKE '%sack%' OR lower(coalesce("nameTh", '')) LIKE '%ถุง%' THEN 'BAG'
  WHEN lower("nameEn") LIKE '%box%' OR lower("nameEn") LIKE '%carton%' OR lower("nameEn") LIKE '%case%' OR "unit" = 'box' THEN 'BOX'
  WHEN "unit" IN ('L', 'l', 'liter', 'litre', 'ltr') THEN 'IBC'
  WHEN "category" = 'RAW_MATERIAL' AND "unit" = 'kg' THEN 'SUPERSACK'
  ELSE 'OTHER'
END;
