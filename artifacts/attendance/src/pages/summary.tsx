import { Layout } from "@/components/layout";
import { useGetAttendanceSummary } from "@workspace/api-client-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Loader2 } from "lucide-react";

export default function Summary() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: summaries = [], isLoading } = useGetAttendanceSummary({ year, month });

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    return { value: (i + 1).toString(), label: format(d, "MMMM", { locale: ar }) };
  });

  const grandTotal = summaries.reduce((acc, curr) => acc + curr.totalSalary, 0);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">ملخص الرواتب</h1>
          <p className="text-muted-foreground mt-1">كشف رواتب الموظفين للشهر المحدد</p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-lg shadow-sm border">
          <Select 
            value={month.toString()} 
            onValueChange={(val) => setCurrentDate(new Date(year, parseInt(val) - 1, 1))}
          >
            <SelectTrigger className="w-[140px] border-none bg-transparent font-medium text-base">
              <SelectValue placeholder="اختر الشهر" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={year.toString()} 
            onValueChange={(val) => setCurrentDate(new Date(parseInt(val), month - 1, 1))}
          >
            <SelectTrigger className="w-[100px] border-none bg-transparent font-medium text-base">
              <SelectValue placeholder="اختر السنة" />
            </SelectTrigger>
            <SelectContent>
              {[year - 1, year, year + 1].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="bg-card border border-dashed rounded-xl p-12 text-center text-muted-foreground">
          لا توجد بيانات حضور لهذا الشهر
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {summaries.map(summary => (
              <div key={summary.employeeId} className="bg-card border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-4 border-b pb-4">{summary.employeeName}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">أيام الحضور</span>
                      <span className="font-semibold text-green-600">{summary.totalPresent} يوم</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">أيام الغياب</span>
                      <span className="font-semibold text-red-600">{summary.totalAbsent} يوم</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">اليومية</span>
                      <span className="font-semibold">{summary.dailyWage.toLocaleString('ar-AE')} ₪</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t bg-muted/30 -mx-6 -mb-6 p-6 rounded-b-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground">الراتب المستحق</span>
                    <span className="text-2xl font-bold text-primary">{summary.totalSalary.toLocaleString('ar-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₪</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-primary text-primary-foreground rounded-xl p-8 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 mt-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-2xl font-bold">إجمالي الرواتب</h2>
              <p className="text-primary-foreground/80 mt-1">مجموع الرواتب المستحقة لجميع الموظفين هذا الشهر</p>
            </div>
            <div className="relative z-10 text-4xl md:text-5xl font-black">
              {grandTotal.toLocaleString('ar-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₪
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}