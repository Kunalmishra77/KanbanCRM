import { useState } from "react";
import { Sidebar, TopBar } from "./LayoutComponents";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-background overflow-hidden relative font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Background Wallpaper Layer - Fixed and Subtle */}
      <div
        className="fixed inset-0 z-0 opacity-30 pointer-events-none saturate-150"
        style={{
          backgroundImage: 'radial-gradient(60% 50% at 15% 10%, hsl(24 95% 60% / 0.35), transparent), radial-gradient(50% 45% at 90% 85%, hsl(210 90% 65% / 0.30), transparent)',
        }}
      />

      <Sidebar mobileOpen={mobileMenuOpen} onMobileClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col h-dvh overflow-hidden relative z-10">
        <TopBar onMenuClick={() => setMobileMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-6 scroll-smooth">
          <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6 pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
