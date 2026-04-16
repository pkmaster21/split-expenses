import { useSearchParams, Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/Button.js';
import { TabbyLogo } from '../components/TabbyLogo.js';
import { CatBackground } from '../components/CatBackground.js';

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={redirect} replace />;
  }

  return (
    <CatBackground className="flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center space-y-10">
        <div className="space-y-4">
          <div className="flex justify-center">
            <TabbyLogo size={64} />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight">Tabby</h1>
            <p className="mt-2 text-stone-500">Settling the tab, purr-fectly.</p>
          </div>
        </div>

        <Button
          onClick={() => login(redirect)}
          size="lg"
          className="w-full"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </Button>
      </div>
    </CatBackground>
  );
}
