import { Router, type IRouter } from "express";
import ExcelJS from "exceljs";
import multer from "multer";
import { and, eq } from "drizzle-orm";
import { db, employeesTable, attendanceTable } from "@workspace/db";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

type AttendanceStatus = "present" | "absent" | "vacation";

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function colLetter(n: number): string {
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
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

  const C = {
    navy: "FF0D1B2A",
    gold: "FFFBBF24",
    goldLight: "FFFEF3C7",
    green: "FF16A34A",
    greenBg: "FFDCFCE7",
    red: "FFDC2626",
    redBg: "FFFEE2E2",
    amber: "FFD97706",
    amberBg: "FFFEF3C7",
    rowAlt: "FFF1F5F9",
    white: "FFFFFFFF",
    border: "FFE2E8F0",
    totalBg: "FF1E3A5F",
    darkText: "FF0F172A",
  };

  const totalCols = 1 + daysInMonth + 3;
  ws.getColumn(1).width = 22;
  for (let d = 1; d <= daysInMonth; d++) {
    ws.getColumn(d + 1).width = 5;
  }
  ws.getColumn(daysInMonth + 2).width = 12;
  ws.getColumn(daysInMonth + 3).width = 14;
  ws.getColumn(daysInMonth + 4).width = 16;

  ws.mergeCells(1, 1, 1, totalCols);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = "صبح للتجارة العامة";
  titleCell.font = { name: "Calibri", size: 20, bold: true, color: { argb: C.white } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.navy } };
  titleCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(1).height = 40;

  ws.mergeCells(2, 1, 2, totalCols);
  const subtitleCell = ws.getCell(2, 1);
  subtitleCell.value = `سجل الحضور الشهري — ${monthName} ${year}`;
  subtitleCell.font = { name: "Calibri", size: 13, bold: true, color: { argb: C.navy } };
  subtitleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.gold } };
  subtitleCell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
  ws.getRow(2).height = 28;

  ws.getRow(3).height = 6;

  const headerRow = ws.getRow(4);
  headerRow.height = 30;

  const hStyle = (col: number, label: string, bgArgb: string = C.navy, fgArgb: string = C.white) => {
    const cell = headerRow.getCell(col);
    cell.value = label;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: fgArgb } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: C.border } },
      bottom: { style: "thin", color: { argb: C.border } },
      left: { style: "thin", color: { argb: C.border } },
      right: { style: "thin", color: { argb: C.border } },
    };
  };

  hStyle(1, "اسم الموظف");
  for (let d = 1; d <= daysInMonth; d++) {
    hStyle(d + 1, String(d), C.navy, C.gold);
  }
  hStyle(daysInMonth + 2, "أيام الحضور", C.totalBg, C.gold);
  hStyle(daysInMonth + 3, "اليومية (₪)", C.totalBg, C.gold);
  hStyle(daysInMonth + 4, "إجمالي الراتب (₪)", C.totalBg, C.gold);

  const statusMap = new Map<string, string>();
  records.forEach((record) => statusMap.set(`${record.employeeId}-${record.day}`, record.status));

  let grandPresent = 0;
  let grandSalary = 0;

  employees.forEach((emp, idx) => {
    const rowNum = 5 + idx;
    const row = ws.getRow(rowNum);
    row.height = 22;

    const isAlt = idx % 2 === 1;
    const rowBg = isAlt ? C.rowAlt : C.white;

    const nameCell = row.getCell(1);
    nameCell.value = emp.name;
    nameCell.font = { name: "Calibri", size: 10, bold: true, color: { argb: C.darkText } };
    nameCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    nameCell.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
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

    const firstDayCol = colLetter(2);
    const lastDayCol = colLetter(daysInMonth + 1);
    const presentCol = colLetter(daysInMonth + 2);
    const wageCol = colLetter(daysInMonth + 3);

    const presentCell = row.getCell(daysInMonth + 2);
    presentCell.value = {
      formula: `COUNTIF(${firstDayCol}${rowNum}:${lastDayCol}${rowNum},"ح")`,
      result: totalPresent,
    };
    presentCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.green } };
    presentCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.greenBg } };
    presentCell.alignment = { horizontal: "center", vertical: "middle" };
    presentCell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };

    const wageCell = row.getCell(daysInMonth + 3);
    wageCell.value = dailyWage;
    wageCell.numFmt = "#,##0.00";
    wageCell.font = { name: "Calibri", size: 10, color: { argb: C.darkText } };
    wageCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: rowBg } };
    wageCell.alignment = { horizontal: "center", vertical: "middle" };
    wageCell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };

    const totalSalary = totalPresent * dailyWage;
    const salaryCell = row.getCell(daysInMonth + 4);
    salaryCell.value = {
      formula: `${presentCol}${rowNum}*${wageCol}${rowNum}`,
      result: totalSalary,
    };
    salaryCell.numFmt = '#,##0.00 "₪"';
    salaryCell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.navy } };
    salaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.goldLight } };
    salaryCell.alignment = { horizontal: "center", vertical: "middle" };
    salaryCell.border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };

    grandPresent += totalPresent;
    grandSalary += totalSalary;
  });

  const totalsRowNum = 5 + employees.length;
  const totalsRow = ws.getRow(totalsRowNum);
  totalsRow.height = 28;

  const tStyle = (col: number, value: string | number, numFmt?: string) => {
    const cell = totalsRow.getCell(col);
    cell.value = value;
    if (numFmt) cell.numFmt = numFmt;
    cell.font = { name: "Calibri", size: 12, bold: true, color: { argb: C.gold } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.totalBg } };
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border = {
      top: { style: "medium", color: { argb: C.gold } },
      bottom: { style: "medium", color: { argb: C.gold } },
      left: { style: "thin", color: { argb: C.gold } },
      right: { style: "thin", color: { argb: C.gold } },
    };
  };

  const firstEmpRow = 5;
  const lastEmpRow = 4 + employees.length;
  const presentColL = colLetter(daysInMonth + 2);
  const salaryColL = colLetter(daysInMonth + 4);

  ws.mergeCells(totalsRowNum, 1, totalsRowNum, daysInMonth + 1);
  tStyle(1, "الإجمالي");

  const grandPresentCell = totalsRow.getCell(daysInMonth + 2);
  grandPresentCell.value = { formula: `SUM(${presentColL}${firstEmpRow}:${presentColL}${lastEmpRow})`, result: grandPresent };
  grandPresentCell.numFmt = "0";
  grandPresentCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: C.gold } };
  grandPresentCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.totalBg } };
  grandPresentCell.alignment = { horizontal: "center", vertical: "middle" };
  grandPresentCell.border = { top: { style: "medium", color: { argb: C.gold } }, bottom: { style: "medium", color: { argb: C.gold } }, left: { style: "thin", color: { argb: C.gold } }, right: { style: "thin", color: { argb: C.gold } } };

  tStyle(daysInMonth + 3, "");

  const grandSalaryCell = totalsRow.getCell(daysInMonth + 4);
  grandSalaryCell.value = { formula: `SUM(${salaryColL}${firstEmpRow}:${salaryColL}${lastEmpRow})`, result: grandSalary };
  grandSalaryCell.numFmt = '#,##0.00 "₪"';
  grandSalaryCell.font = { name: "Calibri", size: 12, bold: true, color: { argb: C.gold } };
  grandSalaryCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.totalBg } };
  grandSalaryCell.alignment = { horizontal: "center", vertical: "middle" };
  grandSalaryCell.border = { top: { style: "medium", color: { argb: C.gold } }, bottom: { style: "medium", color: { argb: C.gold } }, left: { style: "thin", color: { argb: C.gold } }, right: { style: "thin", color: { argb: C.gold } } };

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
    cell.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 4, rightToLeft: true }];

  const filename = `حضور_${monthName}_${year}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

  await wb.xlsx.write(res);
  res.end();
});

router.post("/import/monthly", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "لم يتم إرفاق ملف" });
    return;
  }

  const year = parseInt(req.query.year as string);
  const month = parseInt(req.query.month as string);

  if (!year || !month || month < 1 || month > 12) {
    res.status(400).json({ error: "year and month are required" });
    return;
  }

  const STATUS_MAP: Record<string, AttendanceStatus> = {
    "ح": "present",
    "غ": "absent",
    "إج": "vacation",
    "ج": "vacation",
  };

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(req.file.buffer as never);
  const ws = wb.worksheets[0];

  if (!ws) {
    res.status(400).json({ error: "الملف لا يحتوي على بيانات" });
    return;
  }

  const headerRow = ws.getRow(4);
  const colToDay = new Map<number, number>();

  headerRow.eachCell((cell, colNumber) => {
    if (colNumber === 1) return;
    const val = String(cell.value ?? "").trim();
    const dayNum = parseInt(val);
    if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
      colToDay.set(colNumber, dayNum);
    }
  });

  if (colToDay.size === 0) {
    res.status(400).json({ error: "تنسيق الملف غير صحيح — لم يتم العثور على أعمدة الأيام" });
    return;
  }

  const employees = await db.select().from(employeesTable);
  const nameToEmp = new Map(employees.map((employee) => [employee.name.trim(), employee]));

  const upserted: number[] = [];
  const skipped: string[] = [];

  for (let r = 5; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = String(row.getCell(1).value ?? "").trim();

    if (!name || name === "الإجمالي") {
      continue;
    }

    const emp = nameToEmp.get(name);
    if (!emp) {
      skipped.push(name);
      continue;
    }

    for (const [colNumber, day] of colToDay) {
      const raw = String(row.getCell(colNumber).value ?? "").trim();
      const status = STATUS_MAP[raw];

      if (status) {
        await db
          .insert(attendanceTable)
          .values({ employeeId: emp.id, year, month, day, status })
          .onConflictDoUpdate({
            target: [attendanceTable.employeeId, attendanceTable.year, attendanceTable.month, attendanceTable.day],
            set: { status },
          });
        upserted.push(1);
      } else if (raw === "" || raw === "0") {
        await db
          .delete(attendanceTable)
          .where(
            and(
              eq(attendanceTable.employeeId, emp.id),
              eq(attendanceTable.year, year),
              eq(attendanceTable.month, month),
              eq(attendanceTable.day, day),
            ),
          );
      }
    }
  }

  res.json({
    message: `تم استيراد ${upserted.length} سجل بنجاح`,
    upserted: upserted.length,
    skipped,
  });
});

export default router;
