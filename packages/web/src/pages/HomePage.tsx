import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth.js';
import { api } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { Button } from '../components/Button.js';
import { Badge } from '../components/Badge.js';
import { TabbyLogo } from '../components/TabbyLogo.js';
import { CatBackground } from '../components/CatBackground.js';

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
      <CatBackground className="flex flex-col items-center justify-center p-6 bg-gradient-to-b from-indigo-50 to-white">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-3">
            <div className="flex justify-center">
              <TabbyLogo size={72} />
            </div>
            <h1 className="text-4xl font-bold text-indigo-600">Tabby</h1>
            <p className="text-gray-500">Keep your tabs in check.</p>
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
            <p className="text-sm text-gray-400">
              Have an invite link? Open it directly — no sign-in needed.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { icon: '🔗', title: 'Share a link', desc: 'Invite friends instantly' },
              { icon: '📊', title: 'Track expenses', desc: 'Equal, exact, or % splits' },
              { icon: '✅', title: 'Settle up', desc: 'Fewest transactions possible' },
            ].map((item) => (
              <div key={item.title} className="text-center space-y-1">
                <div className="text-2xl">{item.icon}</div>
                <div className="text-sm font-medium text-gray-700">{item.title}</div>
                <div className="text-xs text-gray-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </CatBackground>
    );
  }

  // Loading state
  if (authLoading || groupsQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Logged in — show group list
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TabbyLogo size={28} />
            <h1 className="text-lg font-bold text-indigo-600">Tabby</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Your groups</h2>
          <Link to="/create">
            <Button size="sm">+ New group</Button>
          </Link>
        </div>

        {groups.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <p className="text-gray-400">You&apos;re not in any groups yet.</p>
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
              className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{item.group.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                  </p>
                </div>
                <Badge variant="indigo">{item.role}</Badge>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
