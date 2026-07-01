import { Layout } from "@/components/layout";
import { useGetAttendanceSummary } from "@workspace/api-client-react";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Loader2, Receipt } from "lucide-react";

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

  const useCounter = (end: number, duration: number = 2) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      let startTime: number | null = null;
      let animationFrame: number;
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        setCount(end * easeProgress);
        if (progress < 1) {
          animationFrame = requestAnimationFrame(step);
        } else {
          setCount(end);
        }
      };
      animationFrame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);
    return count;
  };

  const animatedTotal = useCounter(grandTotal, 2.5);

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">كشف الرواتب</h1>
          <p className="text-primary text-lg font-medium tracking-wide">الاستحقاقات المالية للشهر المحدد</p>
        </div>
        
        <div className="flex items-center gap-3 bg-card/50 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-xl">
          <Select value={month.toString()} onValueChange={(val) => setCurrentDate(new Date(year, parseInt(val) - 1, 1))}>
            <SelectTrigger className="w-[160px] border-none bg-white/5 hover:bg-white/10 text-white font-bold text-lg rounded-xl focus:ring-primary/50">
              <SelectValue placeholder="الشهر" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10 text-white rounded-xl">
              {months.map(m => (
                <SelectItem key={m.value} value={m.value} className="focus:bg-primary/20 focus:text-primary rounded-lg font-bold">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={year.toString()} onValueChange={(val) => setCurrentDate(new Date(parseInt(val), month - 1, 1))}>
            <SelectTrigger className="w-[120px] border-none bg-white/5 hover:bg-white/10 text-white font-bold text-lg rounded-xl focus:ring-primary/50">
              <SelectValue placeholder="السنة" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10 text-white rounded-xl">
              {[year - 1, year, year + 1].map(y => (
                <SelectItem key={y} value={y.toString()} className="focus:bg-primary/20 focus:text-primary rounded-lg font-bold">{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : summaries.length === 0 ? (
        <div className="glass-panel rounded-[2rem] p-16 text-center">
          <Receipt className="w-20 h-20 text-white/20 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white/80">لا توجد بيانات حضور لهذا الشهر</h2>
          <p className="text-white/40 mt-2 font-medium">الرجاء التحقق من سجل الحضور والتأكد من وجود قيود مسجلة</p>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {summaries.map(summary => (
              <div key={summary.employeeId} className="glass-panel rounded-3xl p-6 flex flex-col justify-between group hover:border-primary/50 transition-colors duration-300">
                <div>
                  <h3 className="text-2xl font-black text-white mb-6 pb-4 border-b border-white/10 group-hover:border-primary/30 transition-colors">{summary.employeeName}</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-white/50 uppercase tracking-wider">أيام الحضور</span>
                      <span className="text-green-400 bg-green-400/10 px-3 py-1 rounded-md">{summary.totalPresent} يوم</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-white/50 uppercase tracking-wider">أيام الغياب</span>
                      <span className="text-red-400 bg-red-400/10 px-3 py-1 rounded-md">{summary.totalAbsent} يوم</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-white/50 uppercase tracking-wider">اليومية</span>
                      <span className="text-white bg-white/5 px-3 py-1 rounded-md">{summary.dailyWage.toLocaleString('ar-AE')} ₪</span>
                    </div>
                  </div>
                </div>
                <div className="mt-8 pt-5 border-t border-white/10">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-white/60 text-sm mb-1 uppercase tracking-wider">المستحق</span>
                    <span className="text-3xl font-black text-primary">{summary.totalSalary.toLocaleString('ar-AE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₪</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-primary/90 to-amber-500 rounded-[2.5rem] p-10 shadow-[0_20px_50px_-12px_rgba(251,191,36,0.3)] flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden mt-16">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[80px] rounded-full"></div>
            
            <div className="relative z-10 text-center md:text-right">
              <h2 className="text-3xl font-black text-background mb-2">إجمالي الاستحقاقات</h2>
              <p className="text-background/80 font-bold text-lg">الكتلة النقدية المطلوبة لهذا الشهر</p>
            </div>
            
            <div className="relative z-10 text-5xl md:text-7xl font-black text-background tracking-tighter drop-shadow-md">
              {Math.round(animatedTotal).toLocaleString('ar-AE')} <span className="text-3xl md:text-5xl opacity-80">₪</span>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
