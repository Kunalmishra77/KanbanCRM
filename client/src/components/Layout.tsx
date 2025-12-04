import { Sidebar, TopBar } from "./LayoutComponents";
import generatedImage from '@assets/generated_images/abstract_apple-style_wallpaper_with_soft_gradients.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background overflow-hidden relative font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Background Wallpaper Layer - Fixed and Subtle */}
      <div 
        className="fixed inset-0 z-0 opacity-30 pointer-events-none saturate-150"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
          <div className="max-w-[1600px] mx-auto space-y-6 pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
