import { useState, useEffect, FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Member, ActivityLogEntry, UpdateGroupSettingsRequest } from '@tabby/shared';
import { api, ApiError } from '../lib/api.js';
import { queryKeys } from '../lib/queryKeys.js';
import { Button } from '../components/Button.js';
import { Input } from '../components/Input.js';
import { ConfirmDialog } from '../components/ConfirmDialog.js';
import { TabbyLogo } from '../components/TabbyLogo.js';

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<string | null>(null);

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

  const currentMemberQuery = useQuery({
    queryKey: queryKeys.currentMember(id!),
    queryFn: () => api.getCurrentMember(id!),
  });

  const members: Member[] = membersQuery.data ?? [];
  const activityLog: ActivityLogEntry[] = activityQuery.data ?? [];
  const currentMember: Member | null = currentMemberQuery.data ?? null;

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
    setError('');
    try {
      await updateSettingsMutation.mutateAsync({ regenerateInviteCode: true });
      setSuccess('Invite link regenerated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to regenerate');
    } finally {
      setShowRegenerateConfirm(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!pendingRemoveMemberId) return;
    try {
      await removeMemberMutation.mutateAsync(pendingRemoveMemberId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove member');
    } finally {
      setPendingRemoveMemberId(null);
    }
  };

  const isOwner = currentMember?.role === 'owner';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <TabbyLogo size={28} />
          </Link>
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
                  onClick={() => setShowRegenerateConfirm(true)}
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

        {isOwner && (
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
                      onClick={() => setPendingRemoveMemberId(m.id)}
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

      <ConfirmDialog
        open={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={handleRegenerateLink}
        title="Regenerate invite link"
        message="The current invite link will stop working. Anyone with the old link won't be able to join."
        confirmLabel="Regenerate"
        variant="danger"
        loading={updateSettingsMutation.isPending}
      />

      <ConfirmDialog
        open={!!pendingRemoveMemberId}
        onClose={() => setPendingRemoveMemberId(null)}
        onConfirm={handleRemoveMember}
        title="Remove member"
        message="Are you sure you want to remove this member from the group?"
        confirmLabel="Remove"
        variant="danger"
        loading={removeMemberMutation.isPending}
      />
    </div>
  );
}
