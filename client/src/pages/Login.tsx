import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import generatedImage from '@assets/generated_images/abstract_apple-style_wallpaper_with_soft_gradients.png';

export default function Login() {
  const [email, setEmail] = useState("alex@agentix.com");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(email);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans selection:bg-primary/30 selection:text-primary-foreground">
       {/* Background Wallpaper Layer */}
       <div 
        className="fixed inset-0 z-0 opacity-40 pointer-events-none saturate-150 blur-sm scale-105"
        style={{
          backgroundImage: `url(${generatedImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      <div className="w-full max-w-md z-10 px-4">
        <div className="mb-8 text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-orange-600 shadow-xl flex items-center justify-center mx-auto mb-6 ring-4 ring-white/20">
            <span className="text-white font-bold text-3xl">A</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground drop-shadow-sm">Agentix</h1>
          <p className="text-muted-foreground text-lg">Workspace for the modern era.</p>
        </div>

        <Card className="macos-panel border-white/40 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-xl">Sign in to your account</CardTitle>
            <CardDescription>Enter your email to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="macos-input h-11 bg-white/50"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a href="#" className="text-xs text-primary hover:underline">Forgot password?</a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="macos-input h-11 bg-white/50"
                  placeholder="••••••••"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : "Sign In"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-black/5" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white/50 px-2 text-muted-foreground backdrop-blur-md rounded-full">Or continue with</span>
              </div>
            </div>

            <Button variant="outline" className="w-full h-11 macos-input bg-white/60 hover:bg-white/80 font-normal border-black/5" type="button">
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </CardContent>
          <CardFooter className="justify-center border-t border-black/5 pt-4 pb-4">
             <p className="text-sm text-muted-foreground">
               Don't have an account? <a href="#" className="text-primary font-medium hover:underline">Sign up</a>
             </p>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center text-xs text-muted-foreground/60">
          <p>© 2025 Agentix Inc. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
