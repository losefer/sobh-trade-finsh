import { Router, type IRouter } from "express";
import ExcelJS from "exceljs";
import { and, eq } from "drizzle-orm";
import { db, employeesTable, attendanceTable } from "@workspace/db";
const router: IRouter = Router();

const ARABIC_MONTHS = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

router.get("/export/monthly", async (req, res): Promise<void> => {
  const year = parseInt(req.query.year as string);
  const month = parseInt(req.query.month as string);
  if (!year || !month || month < 1 || month > 12) {
    res.status(400).json({ error: "year and month are required" });
    return;
  }
  const daysInMonth = getDaysInMonth(year, month);
  const monthName = ARABIC_MONTHS[month - 1];

  const employees = await db.select().from(employeesTable).orderBy(employeesTable.createdAt);
  const records = await db
    .select()
    .from(attendanceTable)
    .where(and(eq(attendanceTable.year, year), eq(attendanceTable.month, month)));

  const wb = new ExcelJS.Workbook();
  wb.creator = "صبح للتجارة العامة";
  wb.created = new Date();

  const ws = wb.addWorksheet("سجل الحضور", {
    views: [{ rightToLeft: true }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // ─── Colors ────────────────────────────────────────────────────
  const C = {
    navy:      "FF0D1B2A",   // header deep navy
    gold:      "FFFBBF24",   // accent gold
    goldLight: "FFFEF3C7",   // light gold tint
    green:     "FF16A34A",   // present
    greenBg:   "FFDCFCE7",   // present bg
    red:       "FFDC2626",   // absent
    redBg:     "FFFEE2E2",   // absent bg
    amber:     "FFD97706",   // vacation text
    amberBg:   "FFFEF3C7",   // vacation bg
    grayBg:    "FFF8FAFC",   // empty cell
    rowAlt:    "FFF1F5F9",   // alternating row
    white:     "FFFFFFFF",
    border:    "FFE2E8F0",
    totalBg:   "FF1E3A5F",   // totals row bg
    summaryBg: "FF0F2744",   // summary section bg
    darkText:  "FF0F172A",
  };

  // ─── Column widths ─────────────────────────────────────────────
  // col 1 = employee name, col 2..daysInMonth+1 = days, last 3 = totals
  const totalCols = 1 + daysInMonth + 3; // name + days + present + salary + dailyWage
  ws.getColumn(1).width = 22;
  for (let d = 1; d <= daysInMonth; d++) {
    ws.getColumn(d + 1).width = 5;
  }
  ws.getColumn(daysInMonth + 2).width = 12; // total present
  ws.getColumn(daysInMonth + 3).width = 14; // daily wage
  ws.getColumn(daysInMonth + 4).width = 16; // total salary

  // ─── Row 1: Company title ───────────────────────────────────────
  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "صبح للتجارة العامة";
  titleCell.font = { name: "Calibri", size: 20, bold: true, color: { argb: C.white } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  titleCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rightToLeft" };
  ws.getRow(1).height = 40;

  // ─── Row 2: Sheet subtitle ──────────────────────────────────────
  ws.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value = `سجل الحضور الشهري — ${monthName} ${year}`;
  subtitleCell.font = { name: "Calibri", size: 13, bold: true, color: { argb: C.navy } };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.gold } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rightToLeft" };
  ws.getRow(2).height = 28;

  // ─── Row 3: blank spacer ────────────────────────────────────────
  ws.getRow(3).height = 6;

  // ─── Row 4: Column headers ──────────────────────────────────────
  const headerRow = ws.getRow(4);
  headerRow.height = 30;

  const hStyle = (col: number, label: string, bgArgb: string = C.navy, fgArgb: string = C.white) => {
    const cell = headerRow.getCell(col);
    cell.value = label;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: fgArgb } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rightToLeft", wrapText: true };
    cell.border = {
      top:    { style: "thin", color: { argb: C.border } },
      bottom: { style: "thin", color: { argb: C.border } },
      left:   { style: "thin", color: { argb: C.border } },
      right:  { style: "thin", color: { argb: C.border } },
    };
  };

  hStyle(1, "اسم الموظف");
  for (let d = 1; d <= daysInMonth; d++) {
    hStyle(d + 1, String(d), C.navy, C.gold);
  }
  hStyle(daysInMonth + 2, "أيام الحضور", C.totalBg, C.gold);
  hStyle(daysInMonth + 3, "اليومية (₪)", C.totalBg, C.gold);
  hStyle(daysInMonth + 4, "إجمالي الراتب (₪)", C.totalBg, C.gold);

  // ─── Data rows ──────────────────────────────────────────────────
  const statusMap = new Map<string, string>();
  records.forEach(r => statusMap.set(`${r.employeeId}-${r.day}`, r.status));

  let grandPresent = 0;
  let grandSalary = 0;

  employees.forEach((emp, idx) => {
    const rowNum = 5 + idx;
    const row = ws.getRow(rowNum);
    row.height = 22;

    const isAlt = idx % 2 === 1;
    const rowBg = isAlt ? C.rowAlt : C.white;

    // Name cell
    const nameCell = row.getCell(1);
    nameCell.value = emp.name;
    nameCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: C.darkText } };
    nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    nameCell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rightToLeft" };
    nameCell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };

    let totalPresent = 0;
    const dailyWage = parseFloat(emp.dailyWage);

    for (let d = 1; d <= daysInMonth; d++) {
      const status = statusMap.get(`${emp.id}-${d}`);
      const cell = row.getCell(d + 1);

      if (status === "present") {
        totalPresent++;
        cell.value = "ح";
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: C.green } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
      } else if (status === "absent") {
        cell.value = "غ";
        cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: C.red } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.redBg } };
      } else if (status === "vacation" || status === "holiday") {
        cell.value = "إج";
        cell.font = { name: "Calibri", size: 8, bold: true, color: { argb: C.amber } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.amberBg } };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
      }

      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "hair" }, right: { style: "hair" } };
    }

    const totalSalary = totalPresent * dailyWage;
    grandPresent += totalPresent;
    grandSalary += totalSalary;

    // Present total
    const presentCell = row.getCell(daysInMonth + 2);
    presentCell.value = totalPresent;
    presentCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.green } };
    presentCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
    presentCell.alignment = { horizontal: "center", vertical: "middle" };
    presentCell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };

    // Daily wage
    const wageCell = row.getCell(daysInMonth + 3);
    wageCell.value = dailyWage;
    wageCell.numFmt = '#,##0.00';
    wageCell.font = { name: "Calibri", size: 10, color: { argb: C.darkText } };
    wageCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    wageCell.alignment = { horizontal: "center", vertical: "middle" };
    wageCell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };

    // Total salary
    const salaryCell = row.getCell(daysInMonth + 4);
    salaryCell.value = totalSalary;
    salaryCell.numFmt = '#,##0.00 "₪"';
    salaryCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.navy } };
    salaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.goldLight } };
    salaryCell.alignment = { horizontal: "center", vertical: "middle" };
    salaryCell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  // ─── Totals row ─────────────────────────────────────────────────
  const totalsRowNum = 5 + employees.length;
  const totalsRow = ws.getRow(totalsRowNum);
  totalsRow.height = 28;

  const tStyle = (col: number, value: string | number, numFmt?: string) => {
    const cell = totalsRow.getCell(col);
    cell.value = value;
    if (numFmt) cell.numFmt = numFmt;
    cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: C.gold } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.totalBg } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rightToLeft" };
    cell.border = {
      top: { style: "medium", color: { argb: C.gold } },
      bottom: { style: "medium", color: { argb: C.gold } },
      left: { style: "thin", color: { argb: C.gold } },
      right: { style: "thin", color: { argb: C.gold } },
    };
  };

  ws.mergeCells(totalsRowNum, 1, totalsRowNum, daysInMonth + 1);
  tStyle(1, "الإجمالي");
  tStyle(daysInMonth + 2, grandPresent);
  tStyle(daysInMonth + 3, "");
  tStyle(daysInMonth + 4, grandSalary, '#,##0.00 "₪"');

  // ─── Legend row ─────────────────────────────────────────────────
  const legendRow = totalsRowNum + 2;
  ws.getRow(legendRow).height = 20;

  const legend = [
    { label: "ح = حضور", bg: C.greenBg, color: C.green },
    { label: "غ = غياب", bg: C.redBg, color: C.red },
    { label: "إج = إجازة", bg: C.amberBg, color: C.amber },
  ];

  legend.forEach((item, i) => {
    const col = 1 + i * 2;
    ws.mergeCells(legendRow, col, legendRow, col + 1);
    const cell = ws.getCell(legendRow, col);
    cell.value = item.label;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: item.color } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: item.bg } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rightToLeft" };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  // ─── Freeze panes ───────────────────────────────────────────────
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 4, rightToLeft: true }];

  // ─── Send file ──────────────────────────────────────────────────
  const filename = `حضور_${monthName}_${year}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

  await wb.xlsx.write(res);
  res.end();
});

export default router;
