import { useEffect, useState } from 'react';
import { api } from '@/api/client';
import { Trophy, Crown } from 'lucide-react';

/**
 * Per-team leaderboard: ranks members by how many clue riddles they've solved.
 * Re-loads whenever `refreshKey` changes (e.g. on a realtime team update).
 */
export default function Leaderboard({ teamId, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, refreshKey]);

  async function load() {
    const solves = await api.entities.ClueSolve.filter({ team_id: teamId });
    const counts = {};
    solves.forEach((s) => {
      const name = s.solved_by_name || 'Unknown';
      counts[name] = (counts[name] || 0) + 1;
    });
    const ranked = Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    setRows(ranked);
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="font-heading text-xl font-bold">TEAM LEADERBOARD</h3>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No clues solved yet — be the first!</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.name} className="flex items-center justify-between rounded-md bg-background border border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`font-heading text-sm w-5 ${i === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {i + 1}
                </span>
                {i === 0 && <Crown className="w-4 h-4 text-primary" />}
                <span className="font-medium">{r.name}</span>
              </div>
              <span className="text-sm">
                <span className="font-heading font-bold text-primary">{r.count}</span>
                <span className="text-muted-foreground"> {r.count === 1 ? 'riddle' : 'riddles'} solved</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
