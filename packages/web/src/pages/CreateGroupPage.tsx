import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { useAuth } from '../lib/auth.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';

export default function CreateGroupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, login } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { group } = await api.createGroup({
        name: groupName.trim(),
        displayName: displayName.trim(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.myGroups() });
      navigate(`/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-6">
        <div>
          <Link to="/" className="text-sm text-indigo-600 hover:underline">← Back</Link>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Create a group</h1>
          <p className="mt-1 text-sm text-gray-500">
            Give your group a name and tell us who you are.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Group name"
            placeholder="e.g. Ski Trip 2026"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            required
            maxLength={100}
            autoFocus
          />
          <Input
            label="Your name"
            placeholder="e.g. Alice"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={50}
          />
          {!user && (
            <p className="text-xs text-gray-400">
              Creating as a guest. Your session is saved to this browser only.{' '}
              <button
                type="button"
                onClick={() => login('/create')}
                className="text-indigo-500 hover:underline"
              >
                Sign in with Google
              </button>{' '}
              to keep access across devices.
            </p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create group
          </Button>
        </form>
      </div>
    </div>
  );
}
