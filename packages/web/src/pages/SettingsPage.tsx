import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Member, ActivityLogEntry, UpdateGroupSettingsRequest } from '@tabby/shared';
import { api, ApiError } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch group data on mount — fixes the bug where inviteCode was only
  // available after clicking "Regenerate"
  const groupQuery = useQuery({
    queryKey: queryKeys.group(id!),
    queryFn: () => api.getGroup(id!),
  });

  const membersQuery = useQuery({
    queryKey: queryKeys.members(id!),
    queryFn: () => api.getMembers(id!),
  });

  const activityQuery = useQuery({
    queryKey: queryKeys.activity(id!),
    queryFn: () => api.getActivity(id!),
  });

  const members: Member[] = membersQuery.data ?? [];
  const activityLog: ActivityLogEntry[] = activityQuery.data ?? [];

  // Derive current member from query data
  const storedId = localStorage.getItem(`member_hint_${id}`);
  const currentMember = members.find((m) => m.id === storedId) ?? null;

  // Controlled input for group name — initialized from query data
  const [name, setName] = useState('');
  useEffect(() => {
    if (groupQuery.data?.name && !name) setName(groupQuery.data.name);
  }, [groupQuery.data?.name, name]);

  const inviteCode = groupQuery.data?.inviteCode ?? '';
  const inviteUrl = inviteCode ? `${window.location.origin}/g/${inviteCode}` : '';

  const updateSettingsMutation = useMutation({
    mutationFn: (body: UpdateGroupSettingsRequest) => api.updateGroupSettings(id!, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.group(id!) });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) => api.removeMember(id!, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members(id!) });
    },
  });

  const handleCopy = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await updateSettingsMutation.mutateAsync({ name });
      setSuccess('Group name updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update');
    }
  };

  const handleRegenerateLink = async () => {
    if (!confirm('Regenerate invite link? The old link will stop working.')) return;
    setError('');
    try {
      await updateSettingsMutation.mutateAsync({ regenerateInviteCode: true });
      setSuccess('Invite link regenerated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to regenerate');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member?')) return;
    try {
      await removeMemberMutation.mutateAsync(memberId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove member');
    }
  };

  const isOwner = currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to={`/groups/${id}`} className="text-indigo-600 hover:underline text-sm">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Group Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        {isOwner && (
          <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="font-semibold text-gray-900">Group name</h2>
            <form onSubmit={handleSaveName} className="flex gap-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
                className="flex-1"
                maxLength={100}
                required
                aria-label="Group name"
              />
              <Button type="submit" loading={updateSettingsMutation.isPending}>Save</Button>
            </form>
          </section>
        )}

        <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-900">Invite link</h2>
          {inviteUrl ? (
            <>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 text-gray-600"
                  aria-label="Invite link"
                />
                <Button variant="secondary" onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateLink}
                  loading={updateSettingsMutation.isPending}
                >
                  Regenerate link
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">Loading invite link…</p>
          )}
        </section>

        {isAdmin && (
          <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-semibold text-gray-900">Members</h2>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    {m.displayName}{' '}
                    <span className="text-gray-400 capitalize">({m.role})</span>
                  </span>
                  {m.id !== currentMember?.id && m.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activityLog.length > 0 && (
          <section className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-3">
            <h2 className="font-semibold text-gray-900">Activity</h2>
            <div className="space-y-2">
              {activityLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-sm text-gray-700">{entry.message}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
