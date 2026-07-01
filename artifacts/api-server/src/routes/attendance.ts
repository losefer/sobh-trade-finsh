import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, attendanceTable, employeesTable } from "@workspace/db";
import {
  UpsertAttendanceBody,
  ListAttendanceQueryParams,
  GetAttendanceSummaryQueryParams,
  GetMonthlyStatsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/attendance", async (req, res): Promise<void> => {
  const parsed = ListAttendanceQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, year, month } = parsed.data;

  const conditions = [];
  if (employeeId !== undefined) conditions.push(eq(attendanceTable.employeeId, employeeId));
  if (year !== undefined) conditions.push(eq(attendanceTable.year, year));
  if (month !== undefined) conditions.push(eq(attendanceTable.month, month));

  const records = await db
    .select()
    .from(attendanceTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(attendanceTable.employeeId, attendanceTable.day);

  res.json(records);
});

router.post("/attendance", async (req, res): Promise<void> => {
  const parsed = UpsertAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { employeeId, year, month, day, status } = parsed.data;

  const [record] = await db
    .insert(attendanceTable)
    .values({ employeeId, year, month, day, status })
    .onConflictDoUpdate({
      target: [attendanceTable.employeeId, attendanceTable.year, attendanceTable.month, attendanceTable.day],
      set: { status },
    })
    .returning();

  res.json(record);
});

router.get("/attendance/summary", async (req, res): Promise<void> => {
  const parsed = GetAttendanceSummaryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { year, month } = parsed.data;

  const employees = await db.select().from(employeesTable).orderBy(employeesTable.createdAt);

  const records = await db
    .select()
    .from(attendanceTable)
    .where(
      and(eq(attendanceTable.year, year), eq(attendanceTable.month, month))
    );

  const summary = employees.map((emp) => {
    const empRecords = records.filter((r) => r.employeeId === emp.id);
    const totalPresent = empRecords.filter((r) => r.status === "present").length;
    const totalAbsent = empRecords.filter((r) => r.status === "absent").length;
    const totalHoliday = empRecords.filter((r) => r.status === "holiday").length;
    const totalVacation = empRecords.filter((r) => r.status === "vacation").length;
    const dailyWage = parseFloat(emp.dailyWage);
    const totalSalary = totalPresent * dailyWage;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      phone: emp.phone,
      dailyWage,
      totalPresent,
      totalAbsent,
      totalHoliday,
      totalVacation,
      totalSalary,
    };
  });

  res.json(summary);
});

router.get("/attendance/monthly-stats", async (req, res): Promise<void> => {
  const parsed = GetMonthlyStatsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { year, month } = parsed.data;

  const employees = await db.select().from(employeesTable);
  const records = await db
    .select()
    .from(attendanceTable)
    .where(
      and(eq(attendanceTable.year, year), eq(attendanceTable.month, month))
    );

  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalAbsent = records.filter((r) => r.status === "absent").length;
  const totalHoliday = records.filter((r) => r.status === "holiday").length;
  const totalVacation = records.filter((r) => r.status === "vacation").length;

  let totalSalaryPaid = 0;
  for (const emp of employees) {
    const empPresent = records.filter(
      (r) => r.employeeId === emp.id && r.status === "present"
    ).length;
    totalSalaryPaid += empPresent * parseFloat(emp.dailyWage);
  }

  res.json({
    year,
    month,
    totalEmployees: employees.length,
    totalPresent,
    totalAbsent,
    totalHoliday,
    totalVacation,
    totalSalaryPaid,
  });
});

export default router;
