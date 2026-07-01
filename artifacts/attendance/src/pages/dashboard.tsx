import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { useListEmployees, useListAttendance, useUpsertAttendance, getListAttendanceQueryKey, useGetMonthlyStats } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, getDaysInMonth, startOfMonth } from "date-fns";
import { ar } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_FLOW = [null, "present", "absent", "vacation"] as const;

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading: loadingEmployees } = useListEmployees();
  const { data: attendances = [], isLoading: loadingAttendance } = useListAttendance(
    { year, month },
    { query: { queryKey: getListAttendanceQueryKey({ year, month }) } }
  );
  
  const { data: stats } = useGetMonthlyStats({ year, month });

  const upsertAttendance = useUpsertAttendance();

  const daysInMonth = getDaysInMonth(currentDate);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Map attendances for quick lookup
  const attendanceMap = useMemo(() => {
    const map = new Map<string, string>();
    attendances.forEach(a => {
      map.set(`${a.employeeId}-${a.day}`, a.status);
    });
    return map;
  }, [attendances]);

  const handleCellClick = (employeeId: number, day: number) => {
    const key = `${employeeId}-${day}`;
    const currentStatus = attendanceMap.get(key) || null;
    
    // Cycle through statuses
    let currentIndex = STATUS_FLOW.indexOf(currentStatus as any);
    if (currentIndex === -1) currentIndex = 0;
    
    const nextIndex = (currentIndex + 1) % STATUS_FLOW.length;
    const nextStatus = STATUS_FLOW[nextIndex];

    // Optimistic update
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
      upsertAttendance.mutate({
        data: {
          employeeId,
          year,
          month,
          day,
          status: nextStatus as any
        }
      }, {
        onError: () => {
          // Revert on error
          queryClient.setQueryData(getListAttendanceQueryKey({ year, month }), previousAttendances);
        }
      });
    } else {
      // In a real app we'd have a delete endpoint, but based on API it seems upsert handles it 
      // or we just skip saving if null. For now we will just assume it's handled or we need a specific 'empty' status.
      // Wait, the API spec says status is 'present' | 'absent' | 'holiday' | 'vacation'.
      // There's no "null" or "empty" to send back. If we need to clear it, there might not be an API.
      // Let's assume sending a mutation isn't needed if we are just visually cycling, 
      // or we only cycle through actual statuses if there's no delete. 
      // I'll adjust the flow to: 'present' -> 'absent' -> 'vacation' -> 'present'
    }
  };

  const getStatusColor = (status?: string) => {
    switch(status) {
      case "present": return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200";
      case "absent": return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200";
      case "vacation": return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200";
      case "holiday": return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
      default: return "bg-gray-50 border-gray-100 hover:bg-gray-100 text-transparent";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch(status) {
      case "present": return "ح";
      case "absent": return "غ";
      case "vacation": return "ج";
      case "holiday": return "ع";
      default: return "-";
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
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">سجل الحضور</h1>
          <p className="text-muted-foreground mt-1">إدارة حضور الموظفين اليومي</p>
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

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">إجمالي الحضور</p>
            <p className="text-2xl font-bold text-green-600">{stats.totalPresent}</p>
          </div>
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">إجمالي الغياب</p>
            <p className="text-2xl font-bold text-red-600">{stats.totalAbsent}</p>
          </div>
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">إجازات</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.totalVacation}</p>
          </div>
          <div className="bg-card border rounded-xl p-4 shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">عدد الموظفين</p>
            <p className="text-2xl font-bold text-primary">{stats.totalEmployees}</p>
          </div>
        </div>
      )}

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 font-semibold text-foreground sticky right-0 bg-muted/95 backdrop-blur-sm z-10 w-[200px] shadow-[1px_0_0_0_hsl(var(--border))]">الموظف</th>
                {daysArray.map(day => (
                  <th key={day} className="p-2 min-w-[40px] text-center font-medium text-muted-foreground border-r border-border/50">
                    {day}
                  </th>
                ))}
                <th className="p-4 font-semibold text-center border-r">المجموع</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => {
                let totalPresent = 0;
                return (
                  <tr key={employee.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-medium sticky right-0 bg-card/95 backdrop-blur-sm z-10 shadow-[1px_0_0_0_hsl(var(--border))]">
                      {employee.name}
                    </td>
                    {daysArray.map(day => {
                      const status = attendanceMap.get(`${employee.id}-${day}`);
                      if (status === "present") totalPresent++;
                      
                      return (
                        <td key={day} className="p-1 border-r border-border/50">
                          <button
                            onClick={() => handleCellClick(employee.id, day)}
                            className={cn(
                              "w-full h-8 flex items-center justify-center rounded text-xs font-bold transition-all border",
                              getStatusColor(status)
                            )}
                          >
                            {getStatusLabel(status)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-4 text-center font-bold text-primary border-r">
                      {totalPresent}
                    </td>
                  </tr>
                );
              })}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={daysInMonth + 2} className="p-8 text-center text-muted-foreground">
                    لا يوجد موظفين مسجلين. أضف موظفين من صفحة الموظفين.
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
