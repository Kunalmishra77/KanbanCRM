import { useClients } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, TrendingUp, MoreHorizontal, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CreateClientModal } from "@/components/CreateClientModal";

type ClientData = {
  id: string;
  name: string;
  ownerId: string;
  industry: string;
  stage: string;
  averageProgress: string | number;
  revenueTotal: string | number;
  createdAt: string;
  updatedAt: string;
};

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
          <Link key={client.id} href={`/clients/${client.id}`}>
            <div className="block group cursor-pointer outline-none">
              <Card className="glass-card border-none h-full hover:scale-[1.02] transition-transform duration-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/20 flex items-center justify-center mb-3 border border-white/20 group-hover:border-primary/30 transition-colors">
                      <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline" className={cn(
                      "border-0",
                      client.stage === 'Hot' ? "bg-red-500/10 text-red-600" :
                      client.stage === 'Warm' ? "bg-orange-500/10 text-orange-600" :
                      "bg-blue-500/10 text-blue-600"
                    )}>
                      {client.stage}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">{client.name}</CardTitle>
                  <CardDescription>{client.industry}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-semibold">${Number(client.revenueTotal).toLocaleString()}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Project Progress</span>
                        <span>{Number(client.averageProgress).toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500 group-hover:brightness-110" 
                          style={{ width: `${Number(client.averageProgress)}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </Link>
        ))}
      </div>

      <CreateClientModal 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />
    </div>
  );
}
