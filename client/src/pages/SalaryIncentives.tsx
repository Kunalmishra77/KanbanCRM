import { useState, useMemo } from "react";
import { useIsHROrOwner } from "@/lib/auth";
import { useUsers, useCreateUser } from "@/lib/queries";
import {
  useSalaryRecords, useCreateSalaryRecord, useUpdateSalaryRecord, useDeleteSalaryRecord,
  useIncentives, useCreateIncentive, useUpdateIncentive, useDeleteIncentive,
} from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, IndianRupee, Search, TrendingUp, Gift, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subMonths } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

function getCurrentPeriod() {
  return format(new Date(), "yyyy-MM");
}

function periodLabel(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, "MMM yyyy");
}

function shortPeriodLabel(period: string) {
  const [year, month] = period.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, "MMM yy");
}

const INCENTIVE_TYPES = ["bonus", "commission", "reward", "other"] as const;

export default function SalaryIncentives() {
  const isHROrOwner = useIsHROrOwner();
  const { data: allUsers = [] } = useUsers();
  const { toast } = useToast();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Add Employee modal
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [empForm, setEmpForm] = useState({ firstName: "", lastName: "", email: "", userType: "employee" });
  const { mutate: createEmployee } = useCreateUser();

  const employees = useMemo(() => {
    const q = employeeSearch.toLowerCase();
    return (allUsers as any[]).filter((u: any) =>
      !q || `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  }, [allUsers, employeeSearch]);

  const selectedEmployee = (allUsers as any[]).find((u: any) => u.id === selectedEmployeeId);

  // Salary
  const { data: salaryRecords = [] } = useSalaryRecords(selectedEmployeeId || undefined);
  const { mutate: createSalary } = useCreateSalaryRecord();
  const { mutate: updateSalary } = useUpdateSalaryRecord();
  const { mutate: deleteSalary } = useDeleteSalaryRecord();

  // Incentives
  const { data: incentiveRecords = [] } = useIncentives(selectedEmployeeId || undefined);
  const { mutate: createIncentive } = useCreateIncentive();
  const { mutate: updateIncentive } = useUpdateIncentive();
  const { mutate: deleteIncentive } = useDeleteIncentive();

  // Salary modal
  const [salaryModal, setSalaryModal] = useState<{ open: boolean; record?: any }>({ open: false });
  const [salaryForm, setSalaryForm] = useState({ baseSalary: "", period: getCurrentPeriod(), notes: "" });

  // Incentive modal
  const [incentiveModal, setIncentiveModal] = useState<{ open: boolean; record?: any }>({ open: false });
  const [incentiveForm, setIncentiveForm] = useState({ amount: "", type: "bonus", description: "", period: getCurrentPeriod(), notes: "" });

  if (!isHROrOwner) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Access restricted to Owner and HR only.</p>
      </div>
    );
  }

  // --- Add Employee ---
  function saveEmployee() {
    if (!empForm.firstName || !empForm.lastName) return toast({ title: "First and last name required", variant: "destructive" });
    createEmployee(empForm, {
      onSuccess: () => { setAddEmpOpen(false); setEmpForm({ firstName: "", lastName: "", email: "", userType: "employee" }); toast({ title: "Employee added" }); },
      onError: (e: any) => toast({ title: "Failed to add employee", description: e.message, variant: "destructive" }),
    });
  }

  // --- Salary handlers ---
  function openAddSalary() {
    setSalaryForm({ baseSalary: "", period: getCurrentPeriod(), notes: "" });
    setSalaryModal({ open: true });
  }
  function openEditSalary(record: any) {
    setSalaryForm({ baseSalary: record.baseSalary, period: record.period, notes: record.notes || "" });
    setSalaryModal({ open: true, record });
  }
  function saveSalary() {
    if (!selectedEmployeeId) return toast({ title: "Select an employee first", variant: "destructive" });
    if (!salaryForm.baseSalary || !salaryForm.period) return toast({ title: "Fill in all required fields", variant: "destructive" });
    const payload = { ...salaryForm, employeeId: selectedEmployeeId };
    if (salaryModal.record) {
      updateSalary({ id: salaryModal.record.id, data: payload }, {
        onSuccess: () => { setSalaryModal({ open: false }); toast({ title: "Salary updated" }); },
      });
    } else {
      createSalary(payload, {
        onSuccess: () => { setSalaryModal({ open: false }); toast({ title: "Salary record added" }); },
      });
    }
  }

  // --- Incentive handlers ---
  function openAddIncentive() {
    setIncentiveForm({ amount: "", type: "bonus", description: "", period: getCurrentPeriod(), notes: "" });
    setIncentiveModal({ open: true });
  }
  function openEditIncentive(record: any) {
    setIncentiveForm({ amount: record.amount, type: record.type, description: record.description || "", period: record.period, notes: record.notes || "" });
    setIncentiveModal({ open: true, record });
  }
  function saveIncentive() {
    if (!selectedEmployeeId) return toast({ title: "Select an employee first", variant: "destructive" });
    if (!incentiveForm.amount || !incentiveForm.period) return toast({ title: "Fill in all required fields", variant: "destructive" });
    const payload = { ...incentiveForm, employeeId: selectedEmployeeId };
    if (incentiveModal.record) {
      updateIncentive({ id: incentiveModal.record.id, data: payload }, {
        onSuccess: () => { setIncentiveModal({ open: false }); toast({ title: "Incentive updated" }); },
      });
    } else {
      createIncentive(payload, {
        onSuccess: () => { setIncentiveModal({ open: false }); toast({ title: "Incentive added" }); },
      });
    }
  }

  // Summary stats
  const totalSalaryPaid = (salaryRecords as any[]).reduce((sum: number, r: any) => sum + parseFloat(r.baseSalary || 0), 0);
  const totalIncentivesPaid = (incentiveRecords as any[]).reduce((sum: number, r: any) => sum + parseFloat(r.amount || 0), 0);

  // Chart: last 6 months salary + incentives for selected employee
  const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return format(d, "yyyy-MM");
    });
    return months.map(period => {
      const salary = (salaryRecords as any[])
        .filter((r: any) => r.period === period)
        .reduce((s: number, r: any) => s + parseFloat(r.baseSalary || 0), 0);
      const incentive = (incentiveRecords as any[])
        .filter((r: any) => r.period === period)
        .reduce((s: number, r: any) => s + parseFloat(r.amount || 0), 0);
      return { period: shortPeriodLabel(period), salary, incentive };
    });
  }, [salaryRecords, incentiveRecords]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary & Incentives</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage employee compensation records</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setAddEmpOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>

      {/* Employee selector */}
      <Card className="macos-card border-none">
        <CardContent className="p-4">
          <Label className="text-sm font-medium mb-2 block">Select Employee</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                className="pl-9 h-9"
                value={employeeSearch}
                onChange={e => setEmployeeSearch(e.target.value)}
              />
            </div>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger className="h-9 w-full sm:w-72">
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                    {u.userType === 'co-founder' ? ' (Owner)' : u.userType === 'hr' ? ' (HR)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedEmployee && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="macos-card border-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Salary Paid</p>
                  <p className="text-lg font-bold">₹{totalSalaryPaid.toLocaleString('en-IN')}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="macos-card border-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Incentives</p>
                  <p className="text-lg font-bold">₹{totalIncentivesPaid.toLocaleString('en-IN')}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="macos-card border-none">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Compensation</p>
                  <p className="text-lg font-bold">₹{(totalSalaryPaid + totalIncentivesPaid).toLocaleString('en-IN')}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 6-month chart */}
          <Card className="macos-card border-none">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                6-Month Compensation — {selectedEmployee.firstName} {selectedEmployee.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                      </linearGradient>
                      <linearGradient id="incentiveGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="period" fontSize={11} tickLine={false} axisLine={false} stroke="#888" />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="#888" tickFormatter={v => `₹${v >= 1000 ? (v/1000)+'k' : v}`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '10px', border: 'none', background: 'rgba(255,255,255,0.95)', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                    />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="salary" name="Salary" fill="url(#salaryGrad)" radius={[4,4,0,0]} barSize={18} />
                    <Bar dataKey="incentive" name="Incentive" fill="url(#incentiveGrad)" radius={[4,4,0,0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="salary">
            <TabsList>
              <TabsTrigger value="salary">Salary Records</TabsTrigger>
              <TabsTrigger value="incentives">Incentives & Bonuses</TabsTrigger>
            </TabsList>

            {/* Salary Tab */}
            <TabsContent value="salary" className="mt-4">
              <Card className="macos-card border-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Salary History — {selectedEmployee.firstName} {selectedEmployee.lastName}</CardTitle>
                  <Button size="sm" className="gap-1.5" onClick={openAddSalary}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Record
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Base Salary</TableHead>
                          <TableHead>Notes</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(salaryRecords as any[]).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No salary records yet</TableCell>
                          </TableRow>
                        ) : (
                          (salaryRecords as any[])
                            .sort((a: any, b: any) => b.period.localeCompare(a.period))
                            .map((record: any) => (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">{periodLabel(record.period)}</TableCell>
                                <TableCell>₹{parseFloat(record.baseSalary).toLocaleString('en-IN')}</TableCell>
                                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{record.notes || "—"}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {record.createdAt ? format(new Date(record.createdAt), "dd MMM yyyy") : "—"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditSalary(record)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteSalary(record.id, { onSuccess: () => toast({ title: "Record deleted" }) })}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Incentives Tab */}
            <TabsContent value="incentives" className="mt-4">
              <Card className="macos-card border-none">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Incentives — {selectedEmployee.firstName} {selectedEmployee.lastName}</CardTitle>
                  <Button size="sm" className="gap-1.5" onClick={openAddIncentive}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Incentive
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Added</TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(incentiveRecords as any[]).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No incentive records yet</TableCell>
                          </TableRow>
                        ) : (
                          (incentiveRecords as any[])
                            .sort((a: any, b: any) => b.period.localeCompare(a.period))
                            .map((record: any) => (
                              <TableRow key={record.id}>
                                <TableCell className="font-medium">{periodLabel(record.period)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize text-[11px]">{record.type}</Badge>
                                </TableCell>
                                <TableCell>₹{parseFloat(record.amount).toLocaleString('en-IN')}</TableCell>
                                <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{record.description || "—"}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {record.createdAt ? format(new Date(record.createdAt), "dd MMM yyyy") : "—"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditIncentive(record)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteIncentive(record.id, { onSuccess: () => toast({ title: "Record deleted" }) })}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {!selectedEmployee && (
        <Card className="macos-card border-none">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <IndianRupee className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Select an employee above to view their salary and incentive records</p>
          </CardContent>
        </Card>
      )}

      {/* Add Employee Modal */}
      <Dialog open={addEmpOpen} onOpenChange={setAddEmpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input placeholder="e.g. Rahul" value={empForm.firstName} onChange={e => setEmpForm(f => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input placeholder="e.g. Sharma" value={empForm.lastName} onChange={e => setEmpForm(f => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="rahul@company.com" value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={empForm.userType} onValueChange={v => setEmpForm(f => ({ ...f, userType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="co-founder">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddEmpOpen(false)}>Cancel</Button>
            <Button onClick={saveEmployee}>Add Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Salary Modal */}
      <Dialog open={salaryModal.open} onOpenChange={open => setSalaryModal({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{salaryModal.record ? "Edit Salary Record" : "Add Salary Record"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Period (YYYY-MM) *</Label>
                <Input placeholder="2025-03" value={salaryForm.period} onChange={e => setSalaryForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Base Salary (₹) *</Label>
                <Input type="number" placeholder="50000" value={salaryForm.baseSalary} onChange={e => setSalaryForm(f => ({ ...f, baseSalary: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Any notes..." value={salaryForm.notes} onChange={e => setSalaryForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSalaryModal({ open: false })}>Cancel</Button>
            <Button onClick={saveSalary}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Incentive Modal */}
      <Dialog open={incentiveModal.open} onOpenChange={open => setIncentiveModal({ open })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{incentiveModal.record ? "Edit Incentive" : "Add Incentive"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Period (YYYY-MM) *</Label>
                <Input placeholder="2025-03" value={incentiveForm.period} onChange={e => setIncentiveForm(f => ({ ...f, period: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" placeholder="5000" value={incentiveForm.amount} onChange={e => setIncentiveForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={incentiveForm.type} onValueChange={v => setIncentiveForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INCENTIVE_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="e.g. Q1 performance bonus" value={incentiveForm.description} onChange={e => setIncentiveForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Any notes..." value={incentiveForm.notes} onChange={e => setIncentiveForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncentiveModal({ open: false })}>Cancel</Button>
            <Button onClick={saveIncentive}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
