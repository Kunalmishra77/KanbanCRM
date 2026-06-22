import { useClients, useDeleteClient, useStories, useConvertToLead } from "@/lib/queries";
import { useAuth, useIsHROrOwner, useIsOwner } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, MoreHorizontal, Loader2, Trash2, Receipt, X, Pencil, ArrowRightLeft } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { CreateClientModal } from "@/components/CreateClientModal";
import { EditClientModal } from "@/components/EditClientModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ClientData = {
  id: string;
  name: string;
  ownerId: string;
  industry: string;
  stage: string;
  averageProgress: string | number;
  expectedRevenue: string | number;
  revenueTotal: string | number;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  proposalFileName?: string | null;
  proposalFileData?: string | null;
};

function getHealthScore(client: ClientData, stories: any[]): { score: number; label: string; color: string } {
  const clientStories = stories.filter(s => s.clientId === client.id);
  const done = clientStories.filter(s => s.status === 'Done').length;
  const total = clientStories.length;
  const progressScore = total > 0 ? (done / total) * 40 : 20;

  const expected = Number(client.expectedRevenue || 0);
  const received = Number(client.revenueTotal || 0);
  const revenueScore = expected > 0 ? Math.min((received / expected) * 40, 40) : 20;

  const stageScore = client.stage === 'Hot' ? 20 : client.stage === 'Warm' ? 15 : client.stage === 'Cold' ? 8 : client.stage === 'Hold' ? 10 : 0;

  const total_score = Math.round(progressScore + revenueScore + stageScore);
  if (client.stage === 'Dropped') return { score: 0, label: 'Inactive', color: 'bg-gray-100 text-gray-500' };
  if (client.stage === 'Hold') return { score: total_score, label: 'On Hold', color: 'bg-amber-100 text-amber-700' };
  if (total_score >= 65) return { score: total_score, label: 'Healthy', color: 'bg-green-100 text-green-700' };
  if (total_score >= 35) return { score: total_score, label: 'At Risk', color: 'bg-yellow-100 text-yellow-700' };
  return { score: total_score, label: 'Critical', color: 'bg-red-100 text-red-700' };
}

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const { data: stories = [] } = useStories();
  const { mutate: deleteClient } = useDeleteClient();
  const { mutate: convertToLead } = useConvertToLead();
  const isHROrOwner = useIsHROrOwner();
  const isOwner = useIsOwner();
  const CLIENT_STAGES = ['Hot', 'Warm', 'Cold', 'Hold', 'Dropped'] as const;

  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [clientToConvert, setClientToConvert] = useState<string | null>(null);

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const st = params.get('stage');
    if (st && ['Hot', 'Warm', 'Cold', 'Hold', 'Dropped'].includes(st)) return st;
    return 'Hot';
  }, [searchString]);
  
  const filteredClients = useMemo(() => {
    return clients.filter((c: ClientData) => c.stage === activeTab);
  }, [clients, activeTab]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client relationships, expected revenues, and project workloads.
          </p>
        </div>
        <div className="flex w-full sm:w-auto flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          {isHROrOwner && (
            <Button
              className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20"
              onClick={() => setIsCreateOpen(true)}
              data-testid="button-new-client"
            >
              <Plus className="h-4 w-4" />
              New Client
            </Button>
          )}
        </div>
      </div>

      {/* Tabs System */}
      <Tabs value={activeTab} onValueChange={(val) => setLocation(`/clients?stage=${val}`)} className="w-full space-y-6">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="bg-white/40 dark:bg-black/20">
            {CLIENT_STAGES.map((s) => {
              const count = clients.filter((c: any) => c.stage === s).length;
              return (
                <TabsTrigger key={s} value={s} className="gap-2 text-xs sm:text-sm font-medium">
                  {s}
                  <Badge variant="secondary" className="h-5 px-1.5 py-0 text-[10px] bg-secondary/80 text-muted-foreground font-semibold">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {CLIENT_STAGES.map((s) => (
          <TabsContent key={s} value={s} className="space-y-4 outline-none">
            {filteredClients.length === 0 ? (
              <div className="text-center py-16 bg-white/10 dark:bg-black/10 rounded-2xl border border-dashed border-white/10">
                <p className="text-muted-foreground">No {s.toLowerCase()} clients found.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                {filteredClients.map((client: ClientData) => {
                  const health = getHealthScore(client, stories);
                  return (
                    <div key={client.id} className="relative group/card w-full">
                      <Card className="glass-card border-none hover:scale-[1.008] transition-all duration-200 w-full overflow-hidden">
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between p-4 gap-6">
                          
                          {/* Client Identity & Industry */}
                          <div className="flex items-center gap-4 min-w-[240px] max-w-[340px] shrink-0">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center border border-white/20 shrink-0">
                              <Briefcase className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-0.5 truncate">
                              <h3 className="font-semibold text-base sm:text-lg text-foreground truncate hover:text-primary transition-colors">
                                <Link href={`/clients/${client.id}`}>{client.name}</Link>
                              </h3>
                              <p className="text-xs text-muted-foreground truncate">{client.industry}</p>
                            </div>
                          </div>

                          {/* Stage & Health Badges */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className={cn("border-0 text-[10px] px-2.5 py-1 rounded-full", health.color)}>
                              {health.label}
                            </Badge>
                            <Badge variant="outline" className={cn(
                              "border-0 text-[10px] px-2.5 py-1 rounded-full",
                              client.stage === 'Hot' ? "bg-red-500/10 text-red-600" :
                              client.stage === 'Warm' ? "bg-orange-500/10 text-orange-600" :
                              client.stage === 'Dropped' ? "bg-gray-500/10 text-gray-600" :
                              "bg-blue-500/10 text-blue-600"
                            )}>
                              {client.stage}
                            </Badge>
                          </div>

                          {/* Commercials Section (Collected vs Expected) */}
                          {isOwner && (
                            <div className="flex-1 min-w-[200px] max-w-[320px] space-y-2 shrink-0">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Receipt className="h-3.5 w-3.5 text-primary/70" />
                                  Revenue Collected
                                </span>
                                <span className="font-semibold">
                                  ₹{Number(client.revenueTotal).toLocaleString('en-IN')}
                                  {Number(client.expectedRevenue) > 0 && (
                                    <span className="text-muted-foreground font-normal text-[10px]"> / ₹{Number(client.expectedRevenue).toLocaleString('en-IN')}</span>
                                  )}
                                </span>
                              </div>
                              {Number(client.expectedRevenue) > 0 ? (
                                <div className="space-y-1">
                                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500 transition-all duration-500"
                                      style={{ width: `${Math.min((Number(client.revenueTotal) / Number(client.expectedRevenue)) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <div className="text-[10px] text-right text-muted-foreground">
                                    {((Number(client.revenueTotal) / Number(client.expectedRevenue)) * 100).toFixed(0)}%
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[10px] text-muted-foreground italic">No target set</div>
                              )}
                            </div>
                          )}

                          {/* Project Progress */}
                          <div className="flex-1 min-w-[200px] max-w-[320px] space-y-2 shrink-0">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Project Progress</span>
                              <span className="font-semibold">{Number(client.averageProgress).toFixed(0)}%</span>
                            </div>
                            <div className="space-y-1">
                              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-500"
                                  style={{ width: `${Number(client.averageProgress)}%` }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Quick details action & dropdown */}
                          <div className="flex items-center justify-end gap-2 shrink-0 lg:ml-auto">
                            <Link href={`/clients/${client.id}`}>
                              <Button variant="ghost" size="sm" className="text-xs hover:bg-primary/5 hover:text-primary rounded-lg">
                                View Details
                              </Button>
                            </Link>
                            {isHROrOwner && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-muted/80"
                                    onClick={(e) => e.stopPropagation()}
                                    data-testid={`button-client-menu-${client.id}`}
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="macos-panel">
                                  {isOwner && (
                                    <DropdownMenuItem
                                      className="cursor-pointer text-orange-600 focus:text-orange-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setClientToConvert(client.id);
                                      }}
                                      data-testid={`button-convert-client-${client.id}`}
                                    >
                                      <ArrowRightLeft className="h-4 w-4 mr-2" />
                                      Convert to Lead
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClientToEdit(client);
                                    }}
                                    data-testid={`button-edit-client-${client.id}`}
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Edit Client
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setClientToDelete(client.id);
                                    }}
                                    data-testid={`button-delete-client-${client.id}`}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Client
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>

                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <AlertDialog open={!!clientToDelete} onOpenChange={(open) => !open && setClientToDelete(null)}>
        <AlertDialogContent className="macos-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this client? This will also delete all stories and comments associated with this client. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (clientToDelete) {
                  deleteClient(clientToDelete);
                  setClientToDelete(null);
                }
              }}
              data-testid="button-confirm-delete-client"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!clientToConvert} onOpenChange={(open) => !open && setClientToConvert(null)}>
        <AlertDialogContent className="macos-panel">
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Client to Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to convert this client back to a lead? Converting will delete the client and all associated stories, tasks, comments, and invoices. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:bg-primary/95"
              onClick={() => {
                if (clientToConvert) {
                  convertToLead(clientToConvert);
                  setClientToConvert(null);
                }
              }}
              data-testid="button-confirm-convert-client"
            >
              Convert to Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateClientModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />

      <EditClientModal
        open={!!clientToEdit}
        onOpenChange={(open) => !open && setClientToEdit(null)}
        client={clientToEdit}
      />
    </div>
  );
}
