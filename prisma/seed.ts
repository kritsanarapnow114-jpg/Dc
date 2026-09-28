import { PrismaClient, Category, Zone, LotStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

async function main() {
  // User accounts are ensured on every deploy regardless of other data state,
  // so logins keep working even after a "clear all data" reset.
  const guyHash = await bcrypt.hash("guy1234", 10);
  await db.user.upsert({
    where: { email: "guy" },
    update: { permission: "admin" },
    create: {
      email: "guy",
      passwordHash: guyHash,
      name: "Guy",
      role: "Warehouse Admin",
      permission: "admin",
      avatarInitials: "GY",
    },
  });
  const kritsanaHash = await bcrypt.hash("fls1234", 10);
  await db.user.upsert({
    where: { email: "kritsana" },
    update: { permission: "admin" },
    create: {
      email: "kritsana",
      passwordHash: kritsanaHash,
      name: "Kritsana",
      role: "Warehouse Admin",
      permission: "admin",
      avatarInitials: "K",
    },
  });

  // Remove the old demo login once (guarded), so it stays gone after the admin
  // deletes it instead of being re-created on the next deploy.
  const REMOVE_SOMCHAI_FLAG = "remove_somchai_v1";
  const removedSomchai = await db.seedFlag.findUnique({ where: { key: REMOVE_SOMCHAI_FLAG } });
  if (!removedSomchai) {
    await db.user.deleteMany({ where: { email: "somchai@nbcwarehouse.test" } });
    await db.seedFlag.create({ data: { key: REMOVE_SOMCHAI_FLAG } });
  }

  // NOTE (DC copy): the previous site's real SAP product catalog and bin layout
  // were removed from the seed. Import this DC's own products/locations from
  // the Products and Locations pages (or add a one-time import here, guarded by
  // a SeedFlag like the demo data below).

  // Demo business data is seeded at most once, ever — guarded by a SeedFlag
  // rather than "does any Lot exist", so that using "Reset all data" (which
  // wipes lots to zero) does NOT cause the demo catalog to silently come
  // back on the next deploy.
  const DEMO_DATA_FLAG = "demo_data_v1";
  const demoDataFlag = await db.seedFlag.findUnique({ where: { key: DEMO_DATA_FLAG } });
  const existingLots = await db.lot.count();
  if (demoDataFlag || existingLots > 0) {
    console.log("Demo data already seeded (or real data present) — skipping (users still ensured above).");
    if (!demoDataFlag) await db.seedFlag.create({ data: { key: DEMO_DATA_FLAG } });
    return;
  }

  console.log("Seeding…");

  // ---- Products ----
  const products = [
    { code: "RM-1001", nameEn: "PLA Resin Pellets", nameTh: "เม็ดพลาสติก PLA", category: Category.RAW_MATERIAL, unit: "kg", price: 62, pallet: 500, width: 1.1, length: 1.1, stackLevels: 1 },
    { code: "RM-1002", nameEn: "Corn Starch", nameTh: "แป้งข้าวโพด", category: Category.RAW_MATERIAL, unit: "kg", price: 28, pallet: 800, width: 1.0, length: 1.0, stackLevels: 2 },
    { code: "RM-1003", nameEn: "Lactic Acid Concentrate", nameTh: "สารเข้มข้นกรดแลคติก", category: Category.RAW_MATERIAL, unit: "L", price: 45, pallet: 300, width: 0.6, length: 0.6, stackLevels: 3 },
    { code: "RM-1004", nameEn: "Calcium Carbonate Filler", nameTh: "สารตัวเติมแคลเซียมคาร์บอเนต", category: Category.RAW_MATERIAL, unit: "kg", price: 12, pallet: 1000, width: 1.0, length: 1.0, stackLevels: 3 },
    { code: "PK-2001", nameEn: "BOPP Film Roll", nameTh: "ฟิล์ม BOPP", category: Category.PACKAGING, unit: "roll", price: 340, pallet: 40, width: 0.3, length: 0.3, stackLevels: 4 },
    { code: "PK-2002", nameEn: "Kraft Paper Bag", nameTh: "ถุงกระดาษคราฟท์", category: Category.PACKAGING, unit: "pcs", price: 3.2, pallet: 2000, width: 0.5, length: 0.4, stackLevels: 5 },
    { code: "PK-2003", nameEn: "Corrugated Carton Box", nameTh: "กล่องลูกฟูก", category: Category.PACKAGING, unit: "pcs", price: 9.5, pallet: 300, width: 0.5, length: 0.5, stackLevels: 3 },
    { code: "PK-2004", nameEn: "Label Roll", nameTh: "ม้วนสติกเกอร์", category: Category.PACKAGING, unit: "roll", price: 55, pallet: 100, width: 0.2, length: 0.2, stackLevels: 5 },
    { code: "FG-3001", nameEn: "Compostable Cutlery Set", nameTh: "ช้อนส้อมย่อยสลายได้", category: Category.FINISHED_GOODS, unit: "box", price: 85, pallet: 200, width: 0.4, length: 0.3, stackLevels: 4 },
    { code: "FG-3002", nameEn: "Biodegradable Shopping Bag", nameTh: "ถุงช้อปปิ้งย่อยสลายได้", category: Category.FINISHED_GOODS, unit: "box", price: 120, pallet: 150, width: 0.4, length: 0.3, stackLevels: 4 },
    { code: "FG-3003", nameEn: "PLA Straw Pack", nameTh: "หลอด PLA", category: Category.FINISHED_GOODS, unit: "box", price: 65, pallet: 250, width: 0.35, length: 0.3, stackLevels: 4 },
    { code: "SP-4001", nameEn: "Extruder Screw", nameTh: "สกรูเครื่องอัดรีด", category: Category.SPARE_PARTS, unit: "unit", price: 1500, pallet: 10, width: 0.5, length: 0.2, stackLevels: 1 },
    { code: "SP-4002", nameEn: "Heater Band", nameTh: "แถบฮีตเตอร์", category: Category.SPARE_PARTS, unit: "unit", price: 420, pallet: 50, width: 0.15, length: 0.1, stackLevels: 2 },
  ];
  for (const p of products) {
    await db.product.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  // ---- Locations ----
  const locations = [
    { code: "A-01", zone: Zone.A, width: 4.0, length: 4.0 },
    { code: "A-02", zone: Zone.A, width: 4.0, length: 4.0 },
    { code: "A-03", zone: Zone.A, width: 4.0, length: 4.0 },
    { code: "A-04", zone: Zone.A, width: 4.0, length: 4.0 },
    { code: "A-05", zone: Zone.A, width: 4.0, length: 4.0 },
    { code: "A-06", zone: Zone.A, width: 4.0, length: 4.0 },
    { code: "A-07", zone: Zone.A, width: 4.0, length: 4.0 },
    { code: "B-01", zone: Zone.B, width: 2.0, length: 2.0 },
    { code: "B-02", zone: Zone.B, width: 2.0, length: 2.0 },
    { code: "C-01", zone: Zone.C, width: 2.0, length: 1.5 },
    { code: "C-02", zone: Zone.C, width: 2.0, length: 1.5 },
    { code: "C-03", zone: Zone.C, width: 2.0, length: 1.5 },
    { code: "D-01", zone: Zone.D, width: 2.5, length: 2.0 },
    { code: "D-02", zone: Zone.D, width: 2.5, length: 2.0 },
    { code: "D-03", zone: Zone.D, width: 2.5, length: 2.0 },
    { code: "E-01", zone: Zone.E, width: 1.5, length: 1.5 },
  ];
  for (const l of locations) {
    await db.location.upsert({ where: { code: l.code }, update: {}, create: l });
  }

  // ---- Lots ---- (spread across age buckets, expiry states, QC holds)
  const lots: {
    productCode: string;
    locationCode: string;
    lotNo: string;
    qty: number;
    status: LotStatus;
    recvDate: Date;
    mfgDate: Date | null;
    expDate: Date | null;
  }[] = [
    // RM-1001 PLA Resin — one QC hold, one fresh, one aging
    { productCode: "RM-1001", locationCode: "A-01", lotNo: "LOT-2569-0101", qty: 4200, status: LotStatus.OK, recvDate: daysAgo(12), mfgDate: daysAgo(30), expDate: daysFromNow(340) },
    { productCode: "RM-1001", locationCode: "A-01", lotNo: "LOT-2569-0088", qty: 1800, status: LotStatus.QC, recvDate: daysAgo(70), mfgDate: daysAgo(95), expDate: daysFromNow(270) },
    { productCode: "RM-1001", locationCode: "A-02", lotNo: "LOT-2569-0055", qty: 2600, status: LotStatus.OK, recvDate: daysAgo(150), mfgDate: daysAgo(170), expDate: daysFromNow(120) },
    // RM-1002 Corn Starch
    { productCode: "RM-1002", locationCode: "A-02", lotNo: "LOT-2569-0110", qty: 6400, status: LotStatus.OK, recvDate: daysAgo(20), mfgDate: daysAgo(35), expDate: daysFromNow(400) },
    { productCode: "RM-1002", locationCode: "A-03", lotNo: "LOT-2569-0033", qty: 900, status: LotStatus.OK, recvDate: daysAgo(200), mfgDate: daysAgo(220), expDate: daysAgo(5) }, // expired
    // RM-1003 Lactic Acid
    { productCode: "RM-1003", locationCode: "B-01", lotNo: "LOT-2569-0120", qty: 1450, status: LotStatus.OK, recvDate: daysAgo(8), mfgDate: daysAgo(15), expDate: daysFromNow(25) }, // near expiry
    { productCode: "RM-1003", locationCode: "B-02", lotNo: "LOT-2569-0071", qty: 620, status: LotStatus.OK, recvDate: daysAgo(100), mfgDate: daysAgo(110), expDate: daysFromNow(200) },
    // RM-1004 Calcium Carbonate
    { productCode: "RM-1004", locationCode: "A-03", lotNo: "LOT-2569-0140", qty: 8800, status: LotStatus.OK, recvDate: daysAgo(5), mfgDate: daysAgo(20), expDate: daysFromNow(600) },
    // PK-2001 BOPP Film
    { productCode: "PK-2001", locationCode: "C-01", lotNo: "LOT-2569-0130", qty: 320, status: LotStatus.OK, recvDate: daysAgo(15), mfgDate: null, expDate: null },
    { productCode: "PK-2001", locationCode: "C-01", lotNo: "LOT-2569-0060", qty: 110, status: LotStatus.OK, recvDate: daysAgo(130), mfgDate: null, expDate: null },
    // PK-2002 Kraft Paper Bag
    { productCode: "PK-2002", locationCode: "C-02", lotNo: "LOT-2569-0135", qty: 18000, status: LotStatus.OK, recvDate: daysAgo(10), mfgDate: null, expDate: null },
    // PK-2003 Carton Box
    { productCode: "PK-2003", locationCode: "C-02", lotNo: "LOT-2569-0090", qty: 2200, status: LotStatus.QC, recvDate: daysAgo(60), mfgDate: null, expDate: null }, // QC hold, damaged batch
    // PK-2004 Label Roll
    { productCode: "PK-2004", locationCode: "C-03", lotNo: "LOT-2569-0142", qty: 640, status: LotStatus.OK, recvDate: daysAgo(3), mfgDate: null, expDate: null },
    // FG-3001 Cutlery
    { productCode: "FG-3001", locationCode: "D-01", lotNo: "LOT-2569-0150", qty: 3400, status: LotStatus.OK, recvDate: daysAgo(6), mfgDate: daysAgo(6), expDate: daysFromNow(540) },
    { productCode: "FG-3001", locationCode: "D-01", lotNo: "LOT-2569-0044", qty: 260, status: LotStatus.OK, recvDate: daysAgo(190), mfgDate: daysAgo(190), expDate: daysFromNow(10) }, // near expiry, old age bucket
    // FG-3002 Shopping Bag
    { productCode: "FG-3002", locationCode: "D-02", lotNo: "LOT-2569-0152", qty: 1900, status: LotStatus.OK, recvDate: daysAgo(4), mfgDate: daysAgo(4), expDate: daysFromNow(560) },
    // FG-3003 Straw
    { productCode: "FG-3003", locationCode: "D-03", lotNo: "LOT-2569-0153", qty: 2700, status: LotStatus.OK, recvDate: daysAgo(2), mfgDate: daysAgo(2), expDate: daysFromNow(520) },
    { productCode: "FG-3003", locationCode: "D-03", lotNo: "LOT-2569-0020", qty: 180, status: LotStatus.OK, recvDate: daysAgo(230), mfgDate: daysAgo(230), expDate: daysAgo(2) }, // expired, oldest bucket
    // SP-4001 / SP-4002 — not lot-tracked
    { productCode: "SP-4001", locationCode: "E-01", lotNo: "-", qty: 6, status: LotStatus.OK, recvDate: daysAgo(45), mfgDate: null, expDate: null },
    { productCode: "SP-4002", locationCode: "E-01", lotNo: "-", qty: 22, status: LotStatus.OK, recvDate: daysAgo(45), mfgDate: null, expDate: null },
  ];
  const lotRecords: Awaited<ReturnType<typeof db.lot.create>>[] = [];
  for (const l of lots) {
    const rec = await db.lot.create({ data: l });
    lotRecords.push(rec);
  }
  const lotByNo = (lotNo: string, productCode: string) =>
    lotRecords.find((l) => l.lotNo === lotNo && l.productCode === productCode)!;

  // ---- Purchase Orders ----
  const poDefs = [
    { no: "PO-2569-0007", vendor: "Siam Materials", date: daysAgo(18), status: "PENDING" as const, lines: [{ productCode: "RM-1001", ordered: 6000, received: 4200 }] },
    { no: "PO-2569-0011", vendor: "PackPro", date: daysAgo(9), status: "PENDING" as const, lines: [{ productCode: "PK-2001", ordered: 400, received: 320 }] },
    { no: "PO-2569-0014", vendor: "Thai Sugar", date: daysAgo(22), status: "COMPLETE" as const, lines: [{ productCode: "RM-1002", ordered: 6400, received: 6400 }] },
    { no: "PO-2569-0009", vendor: "Siam Materials", date: daysAgo(60), status: "COMPLETE" as const, lines: [{ productCode: "RM-1003", ordered: 1450, received: 1450 }] },
    { no: "PO-2569-0013", vendor: "BoxCraft", date: daysAgo(5), status: "OPEN" as const, lines: [{ productCode: "PK-2003", ordered: 2500, received: 0 }] },
  ];
  const poRecords: Record<string, string> = {};
  for (const po of poDefs) {
    const rec = await db.purchaseOrder.upsert({
      where: { no: po.no },
      update: {},
      create: {
        no: po.no,
        vendor: po.vendor,
        date: po.date,
        status: po.status,
        lines: { create: po.lines },
      },
    });
    poRecords[po.no] = rec.id;
  }

  // ---- Receipts ----
  const rc1 = await db.receipt.create({
    data: {
      docNo: "RC-2569-0101",
      mode: "PO",
      poId: poRecords["PO-2569-0007"],
      invoiceNo: "INV-2569-3301",
      docDate: daysAgo(12),
      lines: {
        create: [
          {
            productCode: "RM-1001",
            orderedQty: 6000,
            recvQty: 4200,
            lotNo: "LOT-2569-0101",
            locationCode: "A-01",
            mfgDate: daysAgo(30),
            expDate: daysFromNow(340),
            lotId: lotByNo("LOT-2569-0101", "RM-1001").id,
          },
        ],
      },
    },
  });

  const rc2 = await db.receipt.create({
    data: {
      docNo: "RC-2569-0102",
      mode: "PO",
      poId: poRecords["PO-2569-0011"],
      invoiceNo: "INV-2569-3315",
      docDate: daysAgo(15),
      lines: {
        create: [
          {
            productCode: "PK-2001",
            orderedQty: 400,
            recvQty: 320,
            lotNo: "LOT-2569-0130",
            locationCode: "C-01",
            lotId: lotByNo("LOT-2569-0130", "PK-2001").id,
          },
        ],
      },
    },
  });

  void rc1;
  void rc2;

  // ---- Issues (with FEFO selection recorded) ----
  const iss1 = await db.issue.create({
    data: {
      docNo: "ISS-2569-0071",
      issueTo: "Wholesale — Customer",
      docDate: daysAgo(4),
      shippedDate: daysAgo(4),
      lines: {
        create: [
          {
            productCode: "FG-3001",
            fefoLotId: lotByNo("LOT-2569-0044", "FG-3001").id,
            selectedLotId: lotByNo("LOT-2569-0044", "FG-3001").id,
            qty: 200,
          },
        ],
      },
    },
  });
  const iss2 = await db.issue.create({
    data: {
      docNo: "ISS-2569-0079",
      issueTo: "Production — Line A",
      docDate: daysAgo(2),
      shippedDate: daysAgo(1),
      lines: {
        create: [
          {
            productCode: "RM-1002",
            fefoLotId: lotByNo("LOT-2569-0033", "RM-1002").id,
            selectedLotId: lotByNo("LOT-2569-0110", "RM-1002").id, // manual override, non-FEFO
            qty: 800,
          },
        ],
      },
    },
  });
  void iss1;
  void iss2;

  // ---- Adjustment (loss from negative variance) ----
  const adjLot = lotByNo("LOT-2569-0033", "RM-1002"); // the expired one
  await db.adjustment.create({
    data: {
      docNo: "ADJ-2569-0039",
      reason: "EXPIRED",
      docDate: daysAgo(3),
      lines: {
        create: [{ lotId: adjLot.id, sysQty: 900, countedQty: 780 }],
      },
    },
  });

  // ---- Transfer ----
  const trfLot = lotByNo("LOT-2569-0060", "PK-2001");
  await db.transfer.create({
    data: {
      docNo: "TRF-2569-0028",
      operator: "Wipha S.",
      docDate: daysAgo(7),
      lines: {
        create: [
          {
            lotId: trfLot.id,
            fromLocationCode: "C-01",
            toLocationCode: "C-02",
            qty: 110,
          },
        ],
      },
    },
  });

  // ---- Stock Counts (feed Inventory Accuracy KPI + count-progress charts) ----
  const countLotsA = lotRecords.filter((l) => l.locationCode.startsWith("A"));
  await db.stockCount.create({
    data: {
      docNo: "CNT-2569-0016",
      pullZone: "Zone A — Raw Material",
      docDate: daysAgo(21),
      lines: {
        create: countLotsA.map((l) => ({
          lotId: l.id,
          sysQty: l.qty,
          countedQty: l.qty,
        })),
      },
    },
  });
  const countLotsAll = lotRecords.slice(0, 10);
  await db.stockCount.create({
    data: {
      docNo: "CNT-2569-0018",
      pullZone: "All zones",
      docDate: daysAgo(2),
      lines: {
        create: countLotsAll.map((l, i) => ({
          lotId: l.id,
          sysQty: l.qty,
          countedQty: i === 2 ? l.qty - 5 : l.qty, // one small variance
        })),
      },
    },
  });

  // ---- KPI Logs ----
  await db.kpiLog.create({
    data: {
      key: "SAFETY",
      date: new Date(new Date().getFullYear(), 0, 1),
      detail: "Year start · counter reset",
      incident: false,
    },
  });
  await db.kpiLog.createMany({
    data: [
      { key: "COST", date: daysAgo(30), detail: "Switched pallet wrap supplier", amount: 42000 },
      { key: "COST", date: daysAgo(10), detail: "Reduced BOPP scrap via die-cut retune", amount: 18500 },
      { key: "DELIVERY", date: daysAgo(20), issueDocNo: "ISS-2569-0060", onTime: true },
      { key: "DELIVERY", date: daysAgo(15), issueDocNo: "ISS-2569-0063", onTime: true },
      { key: "DELIVERY", date: daysAgo(9), issueDocNo: "ISS-2569-0068", onTime: false },
      { key: "DELIVERY", date: daysAgo(4), issueDocNo: "ISS-2569-0071", onTime: true },
    ],
  });

  await db.seedFlag.create({ data: { key: DEMO_DATA_FLAG } });
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
