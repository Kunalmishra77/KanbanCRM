import { useState, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useStories, useLeads, useClients } from "@/lib/queries";
import { useLocation } from "wouter";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: stories = [], isLoading: isLoadingStories } = useStories();
  const { data: leads = [], isLoading: isLoadingLeads } = useLeads();
  const { data: clients = [], isLoading: isLoadingClients } = useClients();

  const isLoading = isLoadingStories || isLoadingLeads || isLoadingClients;

  // Keybind to open search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const filteredStories = query ? stories.filter((s: any) => 
    s.title.toLowerCase().includes(query.toLowerCase()) || 
    s.description?.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const filteredLeads = query ? leads.filter((l: any) => 
    l.name.toLowerCase().includes(query.toLowerCase()) || 
    l.contactName?.toLowerCase().includes(query.toLowerCase()) ||
    l.contactEmail?.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const filteredClients = query ? clients.filter((c: any) => 
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.contactName?.toLowerCase().includes(query.toLowerCase()) ||
    c.contactEmail?.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const navigateTo = (path: string) => {
    setLocation(path);
    setOpen(false);
  };

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="relative group cursor-pointer"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        <div className="macos-input pl-9 pr-4 py-2 w-full sm:w-[240px] md:w-[320px] rounded-full text-sm text-muted-foreground flex items-center justify-between border border-black/10 shadow-sm bg-white/40 group-hover:bg-white/60 transition-colors">
          <span>Search everything...</span>
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0 bg-background border shadow-xl">
          <div className="flex items-center border-b px-3">
            <Search className="h-5 w-5 text-muted-foreground shrink-0" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a command or search..."
              className="border-0 focus-visible:ring-0 shadow-none bg-transparent h-14 w-full"
              autoFocus
            />
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {query.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Start typing to search stories, leads, and clients...
              </div>
            ) : (
              <div className="space-y-4 p-2">
                {filteredStories.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Stories</h3>
                    {filteredStories.map((s: any) => (
                      <div 
                        key={s.id} 
                        onClick={() => navigateTo(`/?story=${s.id}`)}
                        className="p-2 hover:bg-muted rounded-md cursor-pointer flex justify-between items-center group"
                      >
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[400px]">{s.description}</p>
                        </div>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{s.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredLeads.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Leads</h3>
                    {filteredLeads.map((l: any) => (
                      <div 
                        key={l.id} 
                        onClick={() => navigateTo(`/leads`)}
                        className="p-2 hover:bg-muted rounded-md cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium">{l.name}</p>
                          {l.contactName && <p className="text-xs text-muted-foreground">{l.contactName}</p>}
                        </div>
                        <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-700 rounded-full">{l.stage}</span>
                      </div>
                    ))}
                  </div>
                )}

                {filteredClients.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-2 uppercase tracking-wider">Clients</h3>
                    {filteredClients.map((c: any) => (
                      <div 
                        key={c.id} 
                        onClick={() => navigateTo(`/clients`)}
                        className="p-2 hover:bg-muted rounded-md cursor-pointer flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          {c.contactName && <p className="text-xs text-muted-foreground">{c.contactName}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredStories.length === 0 && filteredLeads.length === 0 && filteredClients.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No results found for "{query}"
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
