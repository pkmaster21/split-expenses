import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [memberCount, setMemberCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [expired, setExpired] = useState(false);

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
      const { group, member } = await api.joinGroup(inviteCode, displayName.trim());
      localStorage.setItem(`member_hint_${group.id}`, member.id);
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !groupName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
          <a href="/" className="mt-4 inline-block text-indigo-600 hover:underline">Go home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div>
          <div className="text-3xl mb-2">👋</div>
          <h1 className="text-2xl font-bold text-gray-900">Join {groupName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {memberCount} {memberCount === 1 ? 'person' : 'people'} already in this group.
          </p>
        </div>

        {expired ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
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
              autoFocus
            />
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
