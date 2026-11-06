import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import agentixLogo from '../assets/agentix-full-logo.png';

export default function Login() {
  const { login, isLoading } = useAuth();
  const loginError = new URLSearchParams(window.location.search).get("error");

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Background Wallpaper Layer */}
      <div
        className="fixed inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(60% 50% at 15% 10%, hsl(24 95% 60% / 0.35), transparent), radial-gradient(50% 45% at 90% 85%, hsl(210 90% 65% / 0.30), transparent)',
        }}
      />

      <div className="w-full max-w-md z-10 px-4">
        <div className="mb-8 text-center space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <img src={agentixLogo} alt="AGENTiX" className="h-32 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Workspace for the modern era.</p>
        </div>

        <Card className="macos-panel border-white/40 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          <CardHeader className="space-y-1 text-center pb-2">
            <CardTitle className="text-xl">Welcome</CardTitle>
            <CardDescription>Sign in with your preferred account to continue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {loginError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                data-testid="login-error"
              >
                {loginError === "not_registered"
                  ? "This Google account isn't registered for this workspace. Ask an admin to add your email."
                  : "Sign-in failed. Please try again."}
              </div>
            )}
            <Button
              className="w-full h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              disabled={isLoading}
              onClick={() => login()}
              data-testid="button-signin"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <>
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
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
                  Continue with Google
                </>
              )}
            </Button>
          </CardContent>
          <CardFooter className="justify-center border-t border-black/5 pt-4 pb-4">
            <p className="text-sm text-muted-foreground text-center">
              Access is limited to registered AGENTiX team members.
            </p>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center text-xs text-muted-foreground/60">
          <p>© {new Date().getFullYear()} AGENTiX. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
