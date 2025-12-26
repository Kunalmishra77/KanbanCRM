import { useClients, useDeleteClient } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, TrendingUp, MoreHorizontal, Loader2, Trash2, Receipt } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CreateClientModal } from "@/components/CreateClientModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
};

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const { mutate: deleteClient } = useDeleteClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">Manage your client relationships and projects.</p>
        </div>
        <Button 
          className="gap-2 shadow-lg shadow-primary/20"
          onClick={() => setIsCreateOpen(true)}
          data-testid="button-new-client"
        >
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {clients.map((client: ClientData) => (
          <div key={client.id} className="relative group/card">
            <Link href={`/clients/${client.id}`}>
              <div className="block cursor-pointer outline-none">
                <Card className="glass-card border-none h-full hover:scale-[1.02] transition-transform duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center mb-3 border border-white/20 group-hover/card:border-primary/30 transition-colors">
                        <Briefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn(
                          "border-0",
                          client.stage === 'Hot' ? "bg-red-500/10 text-red-600" :
                          client.stage === 'Warm' ? "bg-orange-500/10 text-orange-600" :
                          "bg-blue-500/10 text-blue-600"
                        )}>
                          {client.stage}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="text-xl group-hover/card:text-primary transition-colors">{client.name}</CardTitle>
                    <CardDescription>{client.industry}</CardDescription>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          Revenue
                        </span>
                        <div className="text-right">
                          <span className="font-semibold">₹{Number(client.revenueTotal).toLocaleString('en-IN')}</span>
                          {Number(client.expectedRevenue) > 0 && (
                            <span className="text-xs text-muted-foreground"> / ₹{Number(client.expectedRevenue).toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      </div>
                      
                      {Number(client.expectedRevenue) > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Revenue Collected</span>
                            <span>{((Number(client.revenueTotal) / Number(client.expectedRevenue)) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 transition-all duration-500" 
                              style={{ width: `${Math.min((Number(client.revenueTotal) / Number(client.expectedRevenue)) * 100, 100)}%` }} 
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Project Progress</span>
                          <span>{Number(client.averageProgress).toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500 group-hover/card:brightness-110" 
                            style={{ width: `${Number(client.averageProgress)}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-3 right-3 h-8 w-8 opacity-0 group-hover/card:opacity-100 transition-opacity bg-white/80 hover:bg-white shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`button-client-menu-${client.id}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="macos-panel">
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
          </div>
        ))}
      </div>

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

      <CreateClientModal 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />
    </div>
  );
}
