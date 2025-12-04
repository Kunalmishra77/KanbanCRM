import { Sidebar, TopBar } from "./LayoutComponents";
import generatedImage from '@assets/generated_images/abstract_apple-style_wallpaper_with_soft_gradients.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background overflow-hidden relative">
      {/* Background Wallpaper Layer */}
      <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      <Sidebar />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
