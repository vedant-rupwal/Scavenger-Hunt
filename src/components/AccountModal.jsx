import { useState } from 'react';
import { api } from '@/api/client';
import { X, Mail, Shield, Users, Check, Loader2 } from 'lucide-react';

export default function AccountModal({ user, team, onClose, onUpdated }) {
  const [name, setName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== (user?.full_name || '');

  async function handleSave() {
    if (!dirty || !name.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.auth.updateMe({ full_name: name.trim() });
      setSaved(true);
      onUpdated?.(updated);
    } catch (e) {
      console.error('Failed to update account:', e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-2xl font-bold">YOUR ACCOUNT</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Email */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest mb-1">
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <p className="text-foreground font-medium break-all">{user?.email}</p>
          </div>

          {/* Display name (editable) */}
          <div>
            <label className="block text-xs text-muted-foreground uppercase tracking-widest mb-1">
              Display Name
            </label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setSaved(false); }}
                placeholder="Your name"
                className="flex-1 bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSave}
                disabled={!dirty || !name.trim() || saving}
                className="px-4 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : 'Save'}
              </button>
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest mb-1">
              <Shield className="w-3.5 h-3.5" /> Role
            </label>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary capitalize">
              {user?.role || 'player'}
            </span>
          </div>

          {/* Team */}
          <div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-widest mb-1">
              <Users className="w-3.5 h-3.5" /> Team
            </label>
            {team ? (
              <div className="rounded-md border border-border bg-background p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{team.team_name}</span>
                  <code className="font-mono text-sm text-primary">{team.join_code}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  On clue level {team.current_clue_level} · {(team.collected_letters || []).length} letters collected
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not on a team yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
