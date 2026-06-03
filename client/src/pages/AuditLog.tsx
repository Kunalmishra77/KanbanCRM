import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Activity, Search, Filter, Loader2, Download } from "lucide-react";
import { activityAPI } from "@/lib/api";
import { useUsers } from "@/lib/queries";

export default function AuditLog() {
  const { user } = useAuth();
  const { data: users = [] } = useUsers();
  const [filterUser, setFilterUser] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity', 100], // Fetch more for audit log
    queryFn: () => activityAPI.getAll(100),
  });

  const filteredLogs = logs.filter((log: any) => {
    if (filterUser !== "all" && log.userId !== filterUser) return false;
    if (filterType !== "all" && log.entityType !== filterType) return false;
    if (search && !log.details.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getUserName = (id: string) => {
    const u = users.find((u: any) => u.id === id);
    if (!u) return "Unknown User";
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'story': return '📝';
      case 'client': return '🏢';
      case 'invoice': return '💰';
      case 'lead': return '🎯';
      case 'user': return '👤';
      case 'comment': return '💬';
      default: return '📎';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground mt-1">Complete trail of all actions and changes across the system.</p>
      </div>

      <Card className="glass-panel border-white/20">
        <CardHeader className="border-b border-black/5 bg-white/40 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              System Activity
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search details..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white/60"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-4">
            <div className="space-y-1.5 flex-1 max-w-[200px]">
              <Label className="text-xs text-muted-foreground">User</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="bg-white/60 h-8">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((u: any) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1 max-w-[200px]">
              <Label className="text-xs text-muted-foreground">Entity Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white/60 h-8">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="comment">Comment</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 flex justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No matching activity found.
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {filteredLogs.map((log: any) => (
                <div key={log.id} className="p-4 hover:bg-white/40 transition-colors flex gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">
                    {getEntityIcon(log.entityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {log.details}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className="font-medium text-primary/80">{getUserName(log.userId)}</span>
                      <span>•</span>
                      <span>{format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}</span>
                      <span>•</span>
                      <span className="uppercase tracking-wider">{log.action} {log.entityType}</span>
                    </div>
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
