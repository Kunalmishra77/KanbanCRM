import { format } from "date-fns";
import { Clock, MessageSquare, Receipt, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { useClientTimeline } from "@/lib/queries";
import { Loader2 } from "lucide-react";
import { useUsers } from "@/lib/queries";

export function EntityTimeline({ clientId }: { clientId: string }) {
  const { data: timeline, isLoading } = useClientTimeline(clientId);
  const { data: users = [] } = useUsers();

  const getUserName = (id: string | null | undefined) => {
    if (!id) return "Unknown";
    const u = users.find((u: any) => u.id === id);
    if (!u) return id; // fallback
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No history available for this client yet.
      </div>
    );
  }

  return (
    <div className="relative pl-6 py-4 space-y-6">
      {/* Vertical line */}
      <div className="absolute left-[27px] top-4 bottom-4 w-px bg-black/10" />

      {timeline.map((item: any) => (
        <div key={item.id} className="relative">
          {/* Timeline Dot */}
          <div className="absolute -left-[30px] top-1 h-6 w-6 rounded-full border-2 border-white flex items-center justify-center bg-gray-100 text-gray-500 shadow-sm z-10">
            {item.type === 'story' && <FileText className="h-3 w-3 text-blue-500" />}
            {item.type === 'invoice' && <Receipt className="h-3 w-3 text-green-500" />}
            {item.type === 'communication' && <MessageSquare className="h-3 w-3 text-purple-500" />}
            {item.type === 'activity' && <Clock className="h-3 w-3 text-orange-500" />}
          </div>

          {/* Content */}
          <div className="pl-6">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {item.type}
              </span>
              <span className="text-xs text-muted-foreground/60">
                • {format(new Date(item.date), "MMM d, yyyy h:mm a")}
              </span>
            </div>

            <div className="bg-white/40 border border-black/5 rounded-xl p-3 shadow-sm inline-block min-w-[280px] max-w-full">
              {item.type === 'story' && (
                <div>
                  <div className="font-medium">{item.data.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Status: {item.data.status} • Assigned to: {item.data.person || 'Unassigned'}
                  </div>
                </div>
              )}
              {item.type === 'invoice' && (
                <div>
                  <div className="font-medium">{item.data.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Amount: ₹{Number(item.data.amount).toLocaleString('en-IN')} • Status: {item.data.status}
                  </div>
                </div>
              )}
              {item.type === 'communication' && (
                <div>
                  <div className="font-medium capitalize">{item.data.type}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {item.data.summary}
                  </div>
                  <div className="text-xs text-muted-foreground/60 mt-2">
                    Logged by {item.data.loggedBy}
                  </div>
                </div>
              )}
              {item.type === 'activity' && (
                <div>
                  <div className="text-sm">{item.data.details}</div>
                  <div className="text-xs text-muted-foreground/60 mt-1">
                    by {getUserName(item.data.userId)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
