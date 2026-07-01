import { Layout } from "@/components/layout";
import { useListEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee, getListEmployeesQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
          toast({ title: "تم إضافة الموظف بنجاح" });
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
          toast({ title: "تم تحديث بيانات الموظف" });
        }
      }
    );
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا الموظف؟")) {
      deleteEmployee.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListEmployeesQueryKey() });
            toast({ title: "تم حذف الموظف", variant: "destructive" });
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الموظفون</h1>
          <p className="text-muted-foreground mt-1">إدارة بيانات الموظفين واليوميات</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إضافة موظف
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة موظف جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم</Label>
                <Input id="name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input id="phone" dir="ltr" className="text-right" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dailyWage">اليومية (شيكل)</Label>
                <Input id="dailyWage" type="number" min="0" step="0.1" required value={formData.dailyWage} onChange={e => setFormData({...formData, dailyWage: e.target.value})} />
              </div>
              <Button type="submit" className="w-full" disabled={createEmployee.isPending}>
                {createEmployee.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingId} onOpenChange={(open) => { if(!open) { setEditingId(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل بيانات الموظف</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">الاسم</Label>
              <Input id="edit-name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">رقم الهاتف</Label>
              <Input id="edit-phone" dir="ltr" className="text-right" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-dailyWage">اليومية (شيكل)</Label>
              <Input id="edit-dailyWage" type="number" min="0" step="0.1" required value={formData.dailyWage} onChange={e => setFormData({...formData, dailyWage: e.target.value})} />
            </div>
            <Button type="submit" className="w-full" disabled={updateEmployee.isPending}>
              {updateEmployee.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حفظ التعديلات"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : employees.length === 0 ? (
        <div className="bg-card border border-dashed rounded-xl p-12 text-center text-muted-foreground">
          لا يوجد موظفين حالياً. انقر على "إضافة موظف" للبدء.
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="border-b bg-muted/50 text-muted-foreground">
                <th className="p-4 font-semibold text-foreground">الاسم</th>
                <th className="p-4 font-semibold">رقم الهاتف</th>
                <th className="p-4 font-semibold">اليومية</th>
                <th className="p-4 font-semibold w-[100px]">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="p-4 font-medium text-foreground">{employee.name}</td>
                  <td className="p-4" dir="ltr">{employee.phone || "-"}</td>
                  <td className="p-4 font-medium text-primary">{employee.dailyWage} ₪</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(employee)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(employee.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}