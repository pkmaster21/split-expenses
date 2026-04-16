import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { TabbyLogo } from '../components/TabbyLogo.js';
import { appPageStyle } from '../components/CatBackground.js';

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !displayName) {
      setDisplayName(user.name);
    }
  }, [authLoading, user, displayName]);

  useEffect(() => {
    if (!inviteCode) return;
    api
      .getGroupByInviteCode(inviteCode)
      .then((g) => {
        setGroupName(g.name);
        setMemberCount(g.memberCount);
        setExpired(new Date(g.expiresAt) < new Date());
      })
      .catch(() => setError('Group not found'))
      .finally(() => setFetching(false));
  }, [inviteCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    setError('');
    setLoading(true);
    try {
      const { group } = await api.joinGroup(inviteCode, displayName.trim());
      queryClient.invalidateQueries({ queryKey: queryKeys.myGroups() });
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={appPageStyle}>
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !groupName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={appPageStyle}>
        <div className="text-center space-y-4">
          <TabbyLogo size={48} className="mx-auto" />
          <p className="text-lg text-stone-700">Group not found.</p>
          <p className="text-sm text-stone-400">This invite link may be invalid or expired.</p>
          <a href="/" className="inline-block text-orange-500 hover:text-orange-600 text-sm font-medium">← Go home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={appPageStyle}>
      <div className="max-w-md w-full space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-stone-900">Join {groupName}</h1>
          <p className="text-sm text-stone-400">
            {memberCount} {memberCount === 1 ? 'person' : 'people'} already in this group
          </p>
        </div>

        {expired ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            This group has expired and is no longer accepting new members.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Your name"
              placeholder="e.g. Bob"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={50}
              autoFocus={!user}
            />
            {!user && !authLoading && (
              <p className="text-xs text-stone-400">
                Joining as a guest.{' '}
                <Link
                  to={`/login?redirect=/g/${inviteCode}`}
                  className="text-orange-500 hover:text-orange-600 font-medium"
                >
                  Sign in with Google
                </Link>{' '}
                to keep access across devices.
              </p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Join group
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
