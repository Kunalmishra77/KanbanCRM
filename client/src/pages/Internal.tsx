import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useUsers,
  useUpdateUser,
  useFounderInvestments,
  useCreateFounderInvestment,
  useDeleteFounderInvestment,
  useActivityLog,
  useInternalDocuments,
  useCreateInternalDocument,
  useDeleteInternalDocument
} from "@/lib/queries";
import { useAuth } from "@/lib/auth";
import {
  Users,
  IndianRupee,
  Plus,
  Loader2,
  PieChart,
  TrendingUp,
  Building2,
  Trash2,
  FileText,
  Calendar,
  Shield,
  User as UserIcon,
  FolderOpen,
  Upload,
  Link as LinkIcon,
  Download,
  ExternalLink
} from "lucide-react";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { format } from "date-fns";
import type { User, FounderInvestment, ActivityLog, InternalDocument } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

export default function Internal() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading: isLoadingUsers } = useUsers() as { data: User[], isLoading: boolean };
  const { data: investments = [], isLoading: isLoadingInvestments } = useFounderInvestments() as { data: FounderInvestment[], isLoading: boolean };
  const { data: activityLog = [], isLoading: isLoadingActivity } = useActivityLog(20) as { data: ActivityLog[], isLoading: boolean };
  const { data: documents = [], isLoading: isLoadingDocuments } = useInternalDocuments() as { data: InternalDocument[], isLoading: boolean };

  const isCoFounder = currentUser?.userType === 'co-founder';

  if (!isCoFounder) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Shield className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-2xl font-semibold text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground text-center max-w-md">
          This internal dashboard is exclusively for co-founders. Please contact your administrator if you believe you should have access.
        </p>
      </div>
    );
  }

  if (isLoadingUsers || isLoadingInvestments || isLoadingActivity || isLoadingDocuments) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const coFounders = users.filter(u => u.userType === 'co-founder');
  const employees = users.filter(u => u.userType === 'employee');

  const totalInvestment = investments.reduce((acc, inv) => acc + Number(inv.amount || 0), 0);
  const totalShareholding = coFounders.reduce((acc, u) => acc + Number(u.shareholdingPercent || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Internal Dashboard</h1>
        <p className="text-muted-foreground">Co-founder exclusive view of team, investments, and shareholding.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="macos-card border-none" data-testid="stat-card-team">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-100/50">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Team Size</h3>
              <div className="text-2xl font-bold tracking-tight text-foreground">{users.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {coFounders.length} co-founder{coFounders.length !== 1 ? 's' : ''}, {employees.length} employee{employees.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="macos-card border-none" data-testid="stat-card-investment">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-100/50">
                <IndianRupee className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Investment</h3>
              <div className="text-2xl font-bold tracking-tight text-foreground">₹{totalInvestment.toLocaleString('en-IN')}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {investments.length} investment record{investments.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="macos-card border-none" data-testid="stat-card-shareholding">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-100/50">
                <PieChart className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Shareholding Allocated</h3>
              <div className="text-2xl font-bold tracking-tight text-foreground">{totalShareholding.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {(100 - totalShareholding).toFixed(1)}% unallocated
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="team" className="space-y-6">
        <TabsList className="macos-card border-none p-1">
          <TabsTrigger value="team" data-testid="tab-team" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="investments" data-testid="tab-investments" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <IndianRupee className="h-4 w-4 mr-2" />
            Investments
          </TabsTrigger>
          <TabsTrigger value="shareholding" data-testid="tab-shareholding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <PieChart className="h-4 w-4 mr-2" />
            Shareholding
          </TabsTrigger>
          <TabsTrigger value="activity" data-testid="tab-activity" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <TrendingUp className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FolderOpen className="h-4 w-4 mr-2" />
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6">
          <TeamSection users={users} coFounders={coFounders} employees={employees} />
        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          <InvestmentsSection investments={investments} users={users} />
        </TabsContent>

        <TabsContent value="shareholding" className="space-y-6">
          <ShareholdingSection coFounders={coFounders} totalShareholding={totalShareholding} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ActivitySection activityLog={activityLog} users={users} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <DocumentsSection documents={documents} users={users} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamSection({ users, coFounders, employees }: { users: User[], coFounders: User[], employees: User[] }) {
  const updateUser = useUpdateUser();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string>('');
  const [shareholding, setShareholding] = useState<string>('');

  const handleSave = () => {
    if (!editingUser) return;
    updateUser.mutate({
      id: editingUser.id,
      data: {
        userType,
        shareholdingPercent: shareholding,
      }
    }, {
      onSuccess: () => setEditingUser(null),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Co-Founders ({coFounders.length})
        </h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coFounders.map(user => (
            <Card key={user.id} className="macos-card border-none" data-testid={`user-card-${user.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>{user.firstName?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground truncate">{user.firstName} {user.lastName}</h4>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">Co-founder</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {Number(user.shareholdingPercent || 0).toFixed(1)}% equity
                      </Badge>
                    </div>
                  </div>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-3"
                      onClick={() => {
                        setEditingUser(user);
                        setUserType(user.userType || 'employee');
                        setShareholding(user.shareholdingPercent?.toString() || '0');
                      }}
                      data-testid={`edit-user-${user.id}`}
                    >
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="macos-panel">
                    <DialogHeader>
                      <DialogTitle>Edit Team Member</DialogTitle>
                      <DialogDescription>Update role and shareholding for {user.firstName} {user.lastName}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={userType} onValueChange={setUserType}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="co-founder">Co-founder</SelectItem>
                            <SelectItem value="employee">Employee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Shareholding (%)</Label>
                        <Input
                          type="number"
                          value={shareholding}
                          onChange={e => setShareholding(e.target.value)}
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSave} disabled={updateUser.isPending}>
                        {updateUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Save Changes
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserIcon className="h-5 w-5 text-muted-foreground" />
          Employees ({employees.length})
        </h3>
        {employees.length === 0 ? (
          <Card className="macos-card border-none">
            <CardContent className="p-8 text-center text-muted-foreground">
              No employees registered yet. New team members will appear here after they sign in.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {employees.map(user => (
              <Card key={user.id} className="macos-card border-none" data-testid={`user-card-${user.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback>{user.firstName?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground truncate">{user.firstName} {user.lastName}</h4>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <Badge variant="outline" className="text-xs mt-2">Employee</Badge>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-3"
                        onClick={() => {
                          setEditingUser(user);
                          setUserType(user.userType || 'employee');
                          setShareholding(user.shareholdingPercent?.toString() || '0');
                        }}
                        data-testid={`edit-user-${user.id}`}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="macos-panel">
                      <DialogHeader>
                        <DialogTitle>Edit Team Member</DialogTitle>
                        <DialogDescription>Update role and shareholding for {user.firstName} {user.lastName}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={userType} onValueChange={setUserType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="co-founder">Co-founder</SelectItem>
                              <SelectItem value="employee">Employee</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Shareholding (%)</Label>
                          <Input
                            type="number"
                            value={shareholding}
                            onChange={e => setShareholding(e.target.value)}
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={handleSave} disabled={updateUser.isPending}>
                          {updateUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Changes
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InvestmentsSection({ investments, users }: { investments: FounderInvestment[], users: User[] }) {
  const createInvestment = useCreateFounderInvestment();
  const deleteInvestment = useDeleteFounderInvestment();
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    userId: '',
    amount: '',
    description: '',
    investedOn: new Date().toISOString().split('T')[0],
  });

  const coFounders = users.filter(u => u.userType === 'co-founder');

  const handleCreateInvestment = () => {
    if (!newInvestment.userId || !newInvestment.amount) return;
    createInvestment.mutate(newInvestment, {
      onSuccess: () => {
        setIsAddingInvestment(false);
        setNewInvestment({
          userId: '',
          amount: '',
          description: '',
          investedOn: new Date().toISOString().split('T')[0],
        });
      },
    });
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  };

  const investmentsByUser = coFounders.map(user => ({
    user,
    total: investments
      .filter(inv => inv.userId === user.id)
      .reduce((acc, inv) => acc + Number(inv.amount || 0), 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Investment Records</h3>
        <Dialog open={isAddingInvestment} onOpenChange={setIsAddingInvestment}>
          <DialogTrigger asChild>
            <Button data-testid="add-investment-button">
              <Plus className="h-4 w-4 mr-2" />
              Add Investment
            </Button>
          </DialogTrigger>
          <DialogContent className="macos-panel">
            <DialogHeader>
              <DialogTitle>Add Investment</DialogTitle>
              <DialogDescription>Record a new investment from a co-founder.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Co-founder</Label>
                <Select value={newInvestment.userId} onValueChange={v => setNewInvestment({ ...newInvestment, userId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select co-founder" />
                  </SelectTrigger>
                  <SelectContent>
                    {coFounders.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.firstName} {user.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={newInvestment.amount}
                  onChange={e => setNewInvestment({ ...newInvestment, amount: e.target.value })}
                  placeholder="100000"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newInvestment.description}
                  onChange={e => setNewInvestment({ ...newInvestment, description: e.target.value })}
                  placeholder="Seed funding round 1"
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newInvestment.investedOn}
                  onChange={e => setNewInvestment({ ...newInvestment, investedOn: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingInvestment(false)}>Cancel</Button>
              <Button onClick={handleCreateInvestment} disabled={createInvestment.isPending}>
                {createInvestment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Investment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {investmentsByUser.map(({ user, total }) => (
          <Card key={user.id} className="macos-card border-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback>{user.firstName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{user.firstName} {user.lastName}</h4>
                  <p className="text-xl font-bold text-green-600">₹{total.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="macos-card border-none">
        <CardHeader>
          <CardTitle className="text-base">All Investments</CardTitle>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No investments recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {investments.map(inv => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  data-testid={`investment-row-${inv.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100/50">
                      <IndianRupee className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">{getUserName(inv.userId)}</p>
                      <p className="text-sm text-muted-foreground">{inv.description || 'Investment'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-green-600">₹{Number(inv.amount).toLocaleString('en-IN')}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(inv.investedOn), 'MMM d, yyyy')}
                      </p>
                    </div>
                    {inv.fileName && (
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <FileText className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteInvestment.mutate(inv.id)}
                      data-testid={`delete-investment-${inv.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ShareholdingSection({ coFounders, totalShareholding }: { coFounders: User[], totalShareholding: number }) {
  const COLORS = ['hsl(var(--primary))', '#f97316', '#22c55e', '#8b5cf6', '#06b6d4', '#ec4899'];

  const shareholdingData = [
    ...coFounders.map((user, index) => ({
      name: `${user.firstName} ${user.lastName}`,
      value: Number(user.shareholdingPercent || 0),
      color: COLORS[index % COLORS.length],
    })),
    {
      name: 'Unallocated',
      value: Math.max(0, 100 - totalShareholding),
      color: '#e5e7eb',
    }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="macos-card border-none">
          <CardHeader>
            <CardTitle>Equity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={shareholdingData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                    labelLine={false}
                  >
                    {shareholdingData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Share']}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="macos-card border-none">
          <CardHeader>
            <CardTitle>Shareholding Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coFounders.map((user, index) => (
              <div key={user.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{user.firstName} {user.lastName}</span>
                  </div>
                  <span className="font-semibold">{Number(user.shareholdingPercent || 0).toFixed(1)}%</span>
                </div>
                <Progress value={Number(user.shareholdingPercent || 0)} className="h-2" />
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-200" />
                  <span className="font-medium text-muted-foreground">Unallocated</span>
                </div>
                <span className="font-semibold text-muted-foreground">{(100 - totalShareholding).toFixed(1)}%</span>
              </div>
              <Progress value={100 - totalShareholding} className="h-2 mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivitySection({ activityLog, users }: { activityLog: ActivityLog[], users: User[] }) {
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'created': return 'bg-green-100 text-green-700';
      case 'updated': return 'bg-blue-100 text-blue-700';
      case 'deleted': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="macos-card border-none">
      <CardHeader>
        <CardTitle>Team Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activityLog.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No activity recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {activityLog.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                data-testid={`activity-row-${log.id}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getUserName(log.userId).charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{getUserName(log.userId)}</span>
                    <Badge className={`text-xs ${getActionColor(log.action)}`}>{log.action}</Badge>
                    <Badge variant="outline" className="text-xs">{log.entityType}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(log.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DocumentsSection({ documents, users }: { documents: InternalDocument[], users: User[] }) {
  const createDocument = useCreateInternalDocument();
  const deleteDocument = useDeleteInternalDocument();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: '',
    description: '',
    category: 'general',
    externalLink: '',
    fileData: '',
    fileName: '',
    fileType: '',
  });

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocFile(file);
      setNewDocument(prev => ({
        ...prev,
        fileName: file.name,
        fileType: file.type,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!newDocument.title) return;

    setIsUploading(true);
    let finalFileData = newDocument.fileData;

    try {
      if (docFile) {
        const formData = new FormData();
        formData.append('file', docFile);
        formData.append('bucket', 'documents');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        const { publicUrl } = await uploadResponse.json();
        finalFileData = publicUrl;
      }

      createDocument.mutate({
        title: newDocument.title,
        description: newDocument.description || null,
        category: newDocument.category,
        externalLink: newDocument.externalLink || null,
        fileData: finalFileData || null,
        fileName: newDocument.fileName || null,
        fileType: newDocument.fileType || null,
      }, {
        onSuccess: () => {
          setIsDialogOpen(false);
          setDocFile(null);
          setNewDocument({
            title: '',
            description: '',
            category: 'general',
            externalLink: '',
            fileData: '',
            fileName: '',
            fileType: '',
          });
        },
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      // You might want to show a toast here
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (doc: InternalDocument) => {
    if (doc.fileData) {
      // Check if it's a URL (starts with http) or base64 (starts with data:)
      if (doc.fileData.startsWith('http')) {
        window.open(doc.fileData, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = doc.fileData;
        link.download = doc.fileName || 'document';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else if (doc.externalLink) {
      window.open(doc.externalLink, '_blank');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'legal': return 'bg-red-100 text-red-700';
      case 'financial': return 'bg-green-100 text-green-700';
      case 'contracts': return 'bg-blue-100 text-blue-700';
      case 'general': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Company Documents</h3>
          <p className="text-sm text-muted-foreground">Shared internal documents for co-founders only.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-document">
              <Plus className="h-4 w-4 mr-2" />
              Add Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Internal Document</DialogTitle>
              <DialogDescription>
                Upload a document or add a link. Do not store sensitive information like passwords or PAN cards.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="doc-name">Document Title *</Label>
                <Input
                  id="doc-name"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Partnership Agreement"
                  data-testid="input-document-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-description">Description</Label>
                <Textarea
                  id="doc-description"
                  value={newDocument.description}
                  onChange={(e) => setNewDocument(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this document..."
                  data-testid="input-document-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-category">Category</Label>
                <Select
                  value={newDocument.category}
                  onValueChange={(v) => setNewDocument(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger data-testid="select-document-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="contracts">Contracts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document Source</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="doc-file" className="text-xs text-muted-foreground">Upload File</Label>
                    <Input
                      id="doc-file"
                      type="file"
                      onChange={handleFileUpload}
                      className="text-sm"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                      data-testid="input-document-file"
                    />
                  </div>
                  <div>
                    <Label htmlFor="doc-url" className="text-xs text-muted-foreground">Or External Link</Label>
                    <Input
                      id="doc-url"
                      value={newDocument.externalLink}
                      onChange={(e) => setNewDocument(prev => ({ ...prev, externalLink: e.target.value }))}
                      placeholder="https://..."
                      data-testid="input-document-url"
                    />
                  </div>
                </div>
                {newDocument.fileName && (
                  <p className="text-xs text-muted-foreground">File selected: {newDocument.fileName}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={!newDocument.title || createDocument.isPending || isUploading}
                data-testid="button-submit-document"
              >
                {(createDocument.isPending || isUploading) ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Add Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {documents.length === 0 ? (
        <Card className="macos-card border-none">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet.</p>
            <p className="text-sm text-muted-foreground">Click "Add Document" to upload your first document.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <Card key={doc.id} className="macos-card border-none" data-testid={`document-card-${doc.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{doc.title}</h4>
                      <Badge className={`text-[10px] ${getCategoryColor(doc.category)}`}>
                        {doc.category}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => deleteDocument.mutate(doc.id)}
                    data-testid={`button-delete-document-${doc.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {doc.description && (
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{doc.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploaded by {getUserName(doc.uploadedById)}</span>
                  <span>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</span>
                </div>
                {(doc.fileData || doc.externalLink) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3"
                    onClick={() => handleDownload(doc)}
                    data-testid={`button-download-document-${doc.id}`}
                  >
                    {doc.externalLink ? (
                      <>
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open Link
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
