import { Layout } from "@/components/layout";
import { useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type EmployeeFormProps = {
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  buttonText: string;
  formData: { name: string; phone: string; dailyWage: string };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; phone: string; dailyWage: string }>>;
};

function EmployeeForm({ onSubmit, isPending, buttonText, formData, setFormData }: EmployeeFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6 pt-4">
      <div className="space-y-3">
        <Label htmlFor="name" className="text-white/80 font-bold">الاسم الكامل</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
          className="bg-white/5 border-white/10 text-white h-12 text-lg focus-visible:ring-primary"
        />
      </div>
      <div className="space-y-3">
        <Label htmlFor="phone" className="text-white/80 font-bold">رقم التواصل</Label>
        <Input
          id="phone"
          dir="ltr"
          value={formData.phone}
          onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
          className="bg-white/5 border-white/10 text-white h-12 text-lg focus-visible:ring-primary text-right"
        />
      </div>
      <div className="space-y-3">
        <Label htmlFor="dailyWage" className="text-white/80 font-bold">اليومية (شيكل)</Label>
        <Input
          id="dailyWage"
          type="number"
          min="0"
          step="0.1"
          required
          value={formData.dailyWage}
          onChange={e => setFormData(prev => ({ ...prev, dailyWage: e.target.value }))}
          className="bg-white/5 border-white/10 text-primary font-black h-12 text-xl focus-visible:ring-primary"
        />
      </div>
      <Button type="submit" className="w-full h-14 text-lg font-black bg-primary hover:bg-primary/90 text-background rounded-xl mt-4" disabled={isPending}>
        {isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : buttonText}
      </Button>
    </form>
  );
}

export default function Employees() {
  const { data: employees = [], isLoading } = useListEmployees();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({ name: "", phone: "", dailyWage: "" });

  const resetForm = () => setFormData({ name: "", phone: "", dailyWage: "" });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createEmployee.mutate(
      { data: { name: formData.name, phone: formData.phone, dailyWage: Number(formData.dailyWage) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          setIsCreateOpen(false);
          resetForm();
          toast({ title: "تم إضافة الكادر بنجاح", className: "bg-green-500 text-white border-none font-bold" });
        }
      }
    );
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    updateEmployee.mutate(
      { id: editingId, data: { name: formData.name, phone: formData.phone, dailyWage: Number(formData.dailyWage) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
          setEditingId(null);
          resetForm();
          toast({ title: "تم تحديث بيانات الكادر", className: "bg-primary text-background border-none font-bold" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("تحذير: هل أنت متأكد من قرار فصل هذا الكادر؟")) {
      deleteEmployee.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            toast({ title: "تم تنفيذ قرار الفصل", variant: "destructive", className: "font-bold" });
          }
        }
      );
    }
  };

  const openEdit = (emp: any) => {
    setFormData({ name: emp.name, phone: emp.phone || "", dailyWage: emp.dailyWage.toString() });
    setEditingId(emp.id);
  };

  return (
    <Layout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">إدارة الكوادر</h1>
          <p className="text-primary text-lg font-medium tracking-wide">قاعدة بيانات الموظفين واليوميات</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="h-14 px-8 text-lg font-black bg-primary hover:bg-primary/90 text-background rounded-2xl shadow-[0_0_20px_rgba(251,191,36,0.3)] transition-all hover:scale-105">
              <Plus className="w-6 h-6 ml-2" />
              توظيف كادر جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border border-white/10 text-white sm:max-w-[425px] rounded-[2rem] p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-center text-primary">استمارة توظيف</DialogTitle>
            </DialogHeader>
            <EmployeeForm
              onSubmit={handleCreate}
              isPending={createEmployee.isPending}
              buttonText="اعتماد وتوظيف"
              formData={formData}
              setFormData={setFormData}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingId} onOpenChange={(open) => { if(!open) { setEditingId(null); resetForm(); } }}>
        <DialogContent className="bg-card border border-white/10 text-white sm:max-w-[425px] rounded-[2rem] p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-center text-primary">تحديث السجل</DialogTitle>
          </DialogHeader>
          <EmployeeForm
            onSubmit={handleUpdate}
            isPending={updateEmployee.isPending}
            buttonText="حفظ التعديلات"
            formData={formData}
            setFormData={setFormData}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      ) : employees.length === 0 ? (
        <div className="glass-panel rounded-[2rem] p-16 text-center border-dashed border-2 border-white/20">
          <Users className="w-20 h-20 text-white/20 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white/80">قاعدة البيانات فارغة</h2>
          <p className="text-white/40 mt-2 font-medium mb-8">لم يتم تسجيل أي كوادر بعد</p>
          <Button onClick={() => setIsCreateOpen(true)} variant="outline" className="border-primary text-primary hover:bg-primary hover:text-background h-12 px-8 text-lg font-bold rounded-xl">
            إضافة الكادر الأول
          </Button>
        </div>
      ) : (
        <div className="glass-panel rounded-[2rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/10 text-white/60 text-sm uppercase tracking-wider font-bold">
                  <th className="p-6">الكادر</th>
                  <th className="p-6">رقم التواصل</th>
                  <th className="p-6">اليومية المعتمدة</th>
                  <th className="p-6 w-[140px] text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6 font-black text-white text-lg">{employee.name}</td>
                    <td className="p-6 text-white/80 font-mono text-base" dir="ltr">{employee.phone || "—"}</td>
                    <td className="p-6 font-black text-primary text-xl">{employee.dailyWage} <span className="text-sm opacity-60">₪</span></td>
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-3 opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(employee)} className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(employee.id)} className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
