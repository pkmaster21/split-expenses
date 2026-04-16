import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth.js';
import { api } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { TabbyLogo } from '../components/TabbyLogo.js';
import { CatBackground, appPageStyle } from '../components/CatBackground.js';

export default function HomePage() {
  const { user, isLoading: authLoading, login } = useAuth();

  const groupsQuery = useQuery({
    queryKey: queryKeys.myGroups(),
    queryFn: () => api.getMyGroups(),
    retry: false,
  });

  const groups = groupsQuery.data ?? [];

  // Show landing page only when we're certain there's no session at all
  if (!authLoading && !groupsQuery.isLoading && !user && groups.length === 0) {
    return (
      <CatBackground className="flex flex-col items-center justify-center px-6">
        <div className="max-w-sm w-full text-center space-y-10">
          <div className="space-y-4">
            <div className="flex justify-center">
              <TabbyLogo size={72} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-stone-900 tracking-tight">Tabby</h1>
              <p className="mt-2 text-stone-500">Settling the tab, purr-fectly.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link to="/create" className="block">
              <Button size="lg" className="w-full">
                Create a group
              </Button>
            </Link>
            <Button size="lg" className="w-full" variant="secondary" onClick={() => login('/')}>
              Sign in with Google
            </Button>
            <p className="text-sm text-stone-400">
              Have an invite link? Open it to join directly.
            </p>
          </div>
        </div>
      </CatBackground>
    );
  }

  // Loading state
  if (authLoading || groupsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAF8]">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Logged in — show group list
  return (
    <div className="min-h-screen" style={appPageStyle}>
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TabbyLogo size={28} />
            <span className="text-base font-bold text-stone-900">Tabby</span>
          </div>
          <span className="text-sm text-stone-400">{user?.name}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Your groups</h2>
          <Link to="/create">
            <Button size="sm">+ New group</Button>
          </Link>
        </div>

        {groups.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <p className="text-stone-400">You&apos;re not in any groups yet.</p>
            <Link to="/create">
              <Button>Create your first group</Button>
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {groups.map((item) => (
            <Link
              key={item.group.id}
              to={`/groups/${item.group.id}`}
              className="block bg-white rounded-2xl p-4 ring-1 ring-black/[0.06] hover:ring-orange-200 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-900">{item.group.name}</h3>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                  </p>
                </div>
                {item.role !== 'member' && <Badge variant="orange">{item.role}</Badge>}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
