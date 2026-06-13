import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { X, Loader2 } from 'lucide-react';

const DEFAULT_ALLOWED = 5;

export default function AttemptsModal({ team, clues, onClose }) {
  // Map of clue_id -> clue_attempts row (may be missing if the team hasn't
  // opened that clue yet).
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyClueId, setBusyClueId] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id]);

  async function load() {
    setLoading(true);
    const rows = await api.entities.ClueAttempt.filter({ team_id: team.id });
    const map = {};
    rows.forEach((r) => { map[r.clue_id] = r; });
    setRecords(map);
    setLoading(false);
  }

  async function adjustAttempts(clue, n) {
    setBusyClueId(clue.id);
    try {
      const existing = records[clue.id];
      const current = existing ? existing.attempts_allowed : DEFAULT_ALLOWED;
      const next = Math.max(0, current + n); // never below zero
      let row;
      if (existing) {
        row = await api.entities.ClueAttempt.update(existing.id, { attempts_allowed: next });
      } else {
        row = await api.entities.ClueAttempt.create({
          team_id: team.id,
          clue_id: clue.id,
          attempts_used: 0,
          attempts_allowed: next,
        });
      }
      setRecords((prev) => ({ ...prev, [clue.id]: row }));
    } catch (e) {
      console.error('Failed to add attempts:', e);
    } finally {
      setBusyClueId(null);
    }
  }

  const sortedClues = [...clues].sort((a, b) => a.clue_number - b.clue_number);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg">
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-heading text-2xl font-bold">ATTEMPTS</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Team <span className="text-foreground font-medium">{team.team_name}</span> — grant extra tries on any clue.
        </p>

        {loading ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : sortedClues.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">This event has no clues yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedClues.map((clue) => {
              const rec = records[clue.id];
              const used = rec?.attempts_used ?? 0;
              const allowed = rec?.attempts_allowed ?? DEFAULT_ALLOWED;
              const left = allowed - used;
              return (
                <div key={clue.id} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex-shrink-0">
                    #{clue.clue_number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{clue.riddle_text}</p>
                    <p className="text-xs text-muted-foreground">
                      {used} used · {allowed} allowed ·{' '}
                      <span className={left <= 0 ? 'text-destructive font-semibold' : 'text-foreground'}>
                        {left} left
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => adjustAttempts(clue, -5)}
                      disabled={busyClueId === clue.id || allowed <= 0}
                      className="px-2 py-1.5 rounded-md border border-border text-xs font-semibold hover:border-destructive hover:text-destructive transition-colors disabled:opacity-40"
                    >
                      −5
                    </button>
                    <button
                      onClick={() => adjustAttempts(clue, -1)}
                      disabled={busyClueId === clue.id || allowed <= 0}
                      className="px-2 py-1.5 rounded-md border border-border text-xs font-semibold hover:border-destructive hover:text-destructive transition-colors disabled:opacity-40"
                    >
                      −1
                    </button>
                    {busyClueId === clue.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground mx-0.5" />}
                    <button
                      onClick={() => adjustAttempts(clue, 1)}
                      disabled={busyClueId === clue.id}
                      className="px-2 py-1.5 rounded-md border border-border text-xs font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => adjustAttempts(clue, 5)}
                      disabled={busyClueId === clue.id}
                      className="px-2 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      +5
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
