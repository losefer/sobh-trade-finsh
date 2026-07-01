import { useState, useMemo, useRef, useCallback } from "react";
import { Layout } from "@/components/layout";
import { useListEmployees, useListAttendance, useUpsertAttendance, getListAttendanceQueryKey, useGetMonthlyStats } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, getDaysInMonth } from "date-fns";
import { ar } from "date-fns/locale";
import { Loader2, TrendingUp, Users, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_FLOW = [null, "present", "absent", "vacation"] as const;

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: loadingEmployees } = useListEmployees();
  const { data: attendances = [], isLoading: loadingAttendance } = useListAttendance(
    { year, month },
    { query: { queryKey: getListAttendanceQueryKey({ year, month }) } }
  );
  
  const { data: stats } = useGetMonthlyStats({ year, month });
  const upsertAttendance = useUpsertAttendance();
  const mutateFnRef = useRef(upsertAttendance.mutate);
  mutateFnRef.current = upsertAttendance.mutate;

  const daysInMonth = getDaysInMonth(currentDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, string>();
    attendances.forEach(a => {
      map.set(`${a.employeeId}-${a.day}`, a.status);
    });
    return map;
  }, [attendances]);

  const handleCellClick = useCallback((employeeId: number, day: number) => {
    const key = `${employeeId}-${day}`;
    const currentStatus = attendanceMap.get(key) || null;
    
    let currentIndex = STATUS_FLOW.indexOf(currentStatus as any);
    if (currentIndex === -1) currentIndex = 0;
    
    const nextIndex = (currentIndex + 1) % STATUS_FLOW.length;
    const nextStatus = STATUS_FLOW[nextIndex];

    const previousAttendances = queryClient.getQueryData<any[]>(getListAttendanceQueryKey({ year, month })) || [];
    let newAttendances = [...previousAttendances];
    const existingIndex = newAttendances.findIndex(a => a.employeeId === employeeId && a.day === day);
    
    if (existingIndex !== -1) {
      if (nextStatus) {
        newAttendances[existingIndex] = { ...newAttendances[existingIndex], status: nextStatus };
      } else {
        newAttendances.splice(existingIndex, 1);
      }
    } else if (nextStatus) {
      newAttendances.push({ employeeId, year, month, day, status: nextStatus });
    }
    
    queryClient.setQueryData(getListAttendanceQueryKey({ year, month }), newAttendances);

    if (nextStatus) {
      mutateFnRef.current({
        data: { employeeId, year, month, day, status: nextStatus as any }
      }, {
        onError: () => {
          queryClient.setQueryData(getListAttendanceQueryKey({ year, month }), previousAttendances);
        }
      });
    }
  }, [attendanceMap, month, queryClient, year]);

  const getStatusClass = (status?: string) => {
    switch(status) {
      case "present": return "grid-cell-present";
      case "absent": return "grid-cell-absent";
      case "vacation": return "grid-cell-vacation";
      default: return "grid-cell-empty";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch(status) {
      case "present": return "ح";
      case "absent": return "غ";
      case "vacation": return "ج";
      default: return "";
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, i, 1);
    return { value: (i + 1).toString(), label: format(d, "MMMM", { locale: ar }) };
  });

  if (loadingEmployees || loadingAttendance) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">سجل العمليات</h1>
          <p className="text-muted-foreground text-lg">تحكم كامل ومراقبة لحظية لحضور الكوادر</p>
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

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
            <p className="text-sm font-bold text-white/60 mb-2 uppercase tracking-wider relative z-10">الحاضرون</p>
            <p className="text-4xl font-black text-green-400 relative z-10">{stats.totalPresent}</p>
          </div>
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
              <XCircle className="w-16 h-16 text-red-400" />
            </div>
            <p className="text-sm font-bold text-white/60 mb-2 uppercase tracking-wider relative z-10">الغائبون</p>
            <p className="text-4xl font-black text-red-400 relative z-10">{stats.totalAbsent}</p>
          </div>
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
              <TrendingUp className="w-16 h-16 text-primary" />
            </div>
            <p className="text-sm font-bold text-white/60 mb-2 uppercase tracking-wider relative z-10">الإجازات</p>
            <p className="text-4xl font-black text-primary relative z-10">{stats.totalVacation}</p>
          </div>
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all duration-500">
              <Users className="w-16 h-16 text-white" />
            </div>
            <p className="text-sm font-bold text-white/60 mb-2 uppercase tracking-wider relative z-10">إجمالي الكوادر</p>
            <p className="text-4xl font-black text-white relative z-10">{stats.totalEmployees}</p>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden bg-card/60">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-right border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="p-5 font-black text-white text-base sticky right-0 bg-card/95 backdrop-blur-xl z-20 w-[240px] shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">اسم الكادر</th>
                {daysArray.map(day => (
                  <th key={day} className="p-3 min-w-[48px] text-center font-bold text-white/60 border-r border-white/5">
                    {day}
                  </th>
                ))}
                <th className="p-5 font-black text-primary text-center border-r border-white/10 bg-white/5">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                let totalPresent = 0;
                return (
                  <tr key={employee.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-5 font-bold text-white sticky right-0 bg-card/95 backdrop-blur-xl z-10 shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">
                      {employee.name}
                    </td>
                    {daysArray.map(day => {
                      const status = attendanceMap.get(`${employee.id}-${day}`);
                      if (status === "present") totalPresent++;
                      
                      return (
                        <td key={day} className="p-1.5 border-r border-white/5">
                          <button
                            onClick={() => handleCellClick(employee.id, day)}
                            className={cn(
                              "w-full h-10 flex items-center justify-center rounded-lg text-sm font-black cell-transition cursor-pointer border",
                              getStatusClass(status)
                            )}
                          >
                            {getStatusLabel(status)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-5 text-center font-black text-primary text-lg border-r border-white/10 bg-white/5">
                      {totalPresent}
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 2} className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <Users className="w-16 h-16 text-white/20" />
                      <p className="text-xl font-bold text-white/60">مركز العمليات فارغ. قم بإضافة كوادر أولاً.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
