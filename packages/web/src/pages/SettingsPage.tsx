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
import { appPageStyle } from '../components/CatBackground.js';

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [pendingRemoveMemberId, setPendingRemoveMemberId] = useState<string | null>(null);

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
    <div className="min-h-screen" style={appPageStyle}>
      <header className="bg-white border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="hover:opacity-80 transition-opacity">
            <TabbyLogo size={24} />
          </Link>
          <Link to={`/groups/${id}`} className="text-sm text-orange-500 hover:text-orange-600 font-medium">
            ← Back
          </Link>
          <h1 className="text-base font-semibold text-stone-900">Settings</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        {isOwner && (
          <section className="bg-white rounded-2xl p-5 ring-1 ring-black/[0.06] space-y-4">
            <h2 className="font-semibold text-stone-900">Group name</h2>
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

        <section className="bg-white rounded-2xl p-5 ring-1 ring-black/[0.06] space-y-3">
          <h2 className="font-semibold text-stone-900">Invite link</h2>
          {inviteUrl ? (
            <>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 rounded-xl border border-stone-200 px-3.5 py-2.5 text-sm bg-stone-50 text-stone-500"
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
                  className="text-stone-400"
                >
                  Regenerate link
                </Button>
              )}
            </>
          ) : (
            <p className="text-sm text-stone-400">Loading invite link…</p>
          )}
        </section>

        {isOwner && (
          <section className="bg-white rounded-2xl p-5 ring-1 ring-black/[0.06] space-y-3">
            <h2 className="font-semibold text-stone-900">Members</h2>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-stone-700">
                    {m.displayName}{' '}
                    <span className="text-stone-400 capitalize">({m.role})</span>
                  </span>
                  {m.id !== currentMember?.id && m.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingRemoveMemberId(m.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
          <section className="bg-white rounded-2xl p-5 ring-1 ring-black/[0.06] space-y-3">
            <h2 className="font-semibold text-stone-900">Activity</h2>
            <div className="space-y-3">
              {activityLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <span className="text-xs text-stone-400 shrink-0 mt-0.5">
                    {new Date(entry.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-sm text-stone-600">{entry.message}</span>
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
