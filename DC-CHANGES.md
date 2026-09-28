# DC copy — what changed from NBC Warehouse (plant)

This branch turns the plant WMS into a distribution-center (DC) WMS: the
production-plant modules are removed and a Customer Returns module is added.

## Removed

| Area | What went |
| --- | --- |
| Pages | Pack Order (`/pack`), OEE (`/oee`), Packaging Plan (`/plan`), Feed to SILO (`/silo`), Non-Stock (`/nonstock`) |
| Receive | "From Production" mode, OEE capture, pending-verify queue, Full/Partial pallet cards, SU / weight / pack-time columns, Stock vs Non-Stock toggle |
| Products | BOM editor |
| Issue | Non-Stock issuing (holdings) and the per-line Stock/Non-Stock toggle |
| Reports | Production, production material usage/loss reports; the NatureWorks/Ingeo PowerPoint deck export (`pptxgenjs` dependency removed) |
| Settings | OEE standards / downtime reasons / OEE report cards, BOM source, production lines & shifts |
| Data model | `Bom`, `BomLine`, `ReceiptBomLoss`, `ReceiptMaterialConsumption`, `SiloStaging`, `SiloLoad`, `NonStockHolding`, `Conversion`, enum `StockType`, `ReceiptMode.PRODUCTION`, production/OEE columns on `Receipt` / `ReceiptLine`, non-stock columns on `Issue` / `IssueLine` |
| Seed | The previous site's real SAP product catalog and A01–B84 bin layout; BOM and production demo receipts |
| Branding | NatureWorks logo on the printed cycle-count sheet (FLS logo kept) |

## Added — Customer Returns (`/returns`, menu Inbound → Customer Returns)

- Document `RT-<BE year>-0001`, optional link to the customer and to the original shipment (external goods issue). Picking a shipment lists its lines to add with one tap (lot, location, mfg/exp prefilled).
- Every line gets a QC disposition:
  - **คืนสต็อก (RESTOCK)** → booked into a lot with status `OK` (FEFO can pick it)
  - **กักตรวจ (HOLD)** → booked into a lot with status `QC` (never picked by FEFO)
  - **ตัดทิ้ง (SCRAP)** → recorded only, no stock
- Reverse / Delete / Redo from the history, like every other document.
- Return reasons are an editable pick-list on Settings.
- Returns appear in the Stock Card (type `Return`), stock "as of" date reconstruction, Reports (new "Customer Returns" report + Excel export), Compare Periods, and the dashboard **Quality KPI**, which is now "% of shipped units not returned" (target 99.5%).

## Also changed

- Menu regrouped: Overview · Inventory · Inbound (Receive, PO, Put Away, Customer Returns) · Outbound (Ship Order, Goods Issue, Customers) · Analytics.
- `/issue` renamed from "Transfer" to **Goods Issue (จ่ายสินค้า FEFO)** so it no longer clashes with Put Away.
- Default "Issue To" list is DC-oriented (internal use, samples, write-off, transfer to other DC).

## Database migration

`prisma/migrations/20260929120000_dc_remove_production_add_returns` drops the
production tables/columns and creates `CustomerReturn` / `CustomerReturnLine`.

- Intended for a **fresh DC database**. A guard at the top aborts before
  dropping anything if production receipts, BOMs, SILO or Non-Stock rows exist.
- Verified on PostgreSQL 16: the full migration chain applies cleanly, a
  re-apply is a no-op, and the resulting tables/columns/enums match
  `schema.prisma` exactly.

## Before going live

- Set new `SESSION_SECRET` and `DATABASE_URL` for the DC deployment.
- `prisma/seed.ts` still creates the `guy` / `kritsana` logins with fixed
  passwords — change them (or the seed) before the DC goes live.
- Load the DC's own products and locations (Products / Locations pages).
- Zones are still the fixed enum A–E and categories are still
  Raw Material / Packaging / Finished Goods / IO & Resin; retune for the DC.
