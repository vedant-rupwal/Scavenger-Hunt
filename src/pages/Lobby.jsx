import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { Users, Plus, LogIn, QrCode, LogOut, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import AccountModal from '@/components/AccountModal';
import Leaderboard from '@/components/Leaderboard';
import { toast } from '@/components/ui/use-toast';

function generateJoinCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

export default function Lobby() {
  const [user, setUser] = useState(null);
  const [team, setTeam] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [teamName, setTeamName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [lbRefresh, setLbRefresh] = useState(0); // bump to reload the leaderboard
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  // Live updates: when ANY member solves a clue, the team row is updated in the
  // database. Subscribe to UPDATEs on just this team's row so every member's
  // lobby reflects the new progress instantly — no refresh needed.
  useEffect(() => {
    if (!team?.id) return;
    const unsubscribe = api.entities.Team.subscribe(
      ({ data }) => {
        if (!data) return;
        setTeam((prev) => ({ ...prev, ...data }));
        setLbRefresh((k) => k + 1);
        toast({
          title: 'A teammate scanned a new clue!',
          description: data.last_solved_by
            ? `${data.last_solved_by} advanced your team to clue ${data.current_clue_level}.`
            : `Your team is now on clue ${data.current_clue_level}.`,
        });
      },
      { event: 'UPDATE', filter: `id=eq.${team.id}` }
    );
    return unsubscribe;
  }, [team?.id]);

  async function loadData() {
    try {
      const me = await api.auth.me();
      setUser(me);
      if (me.role === 'admin') {
        navigate('/admin');
        return;
      }
      // Redirect to lobby if coming from landing

      if (me.team_id) {
        const teams = await api.entities.Team.filter({ id: me.team_id });
        if (teams.length > 0) setTeam(teams[0]);
      }
      const evs = await api.entities.Event.filter({ status: 'active' });
      setEvents(evs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam() {
    setError('');
    if (!teamName.trim()) return setError('Please enter a team name.');
    if (!selectedEventId) return setError('Please select an event.');
    setSubmitting(true);
    try {
      const code = generateJoinCode();
      const newTeam = await api.entities.Team.create({
        team_name: teamName.trim(),
        join_code: code,
        current_clue_level: 1,
        event_id: selectedEventId,
        member_ids: [user.id],
        member_names: [user.full_name || user.email],
        collected_letters: [],
        completed: false,
      });
      await api.auth.updateMe({ team_id: newTeam.id });
      setTeam(newTeam);
      setMode(null);
    } catch (e) {
      setError('Failed to create team. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoinTeam() {
    setError('');
    if (!joinCode.trim()) return setError('Please enter a join code.');
    setSubmitting(true);
    try {
      const teams = await api.entities.Team.filter({ join_code: joinCode.trim().toUpperCase() });
      if (teams.length === 0) return setError('Invalid join code. Check with your team captain.');
      const found = teams[0];
      const members = found.member_ids || [];
      if (members.length >= 4) return setError('This team is full (max 4 members).');
      if (members.includes(user.id)) return setError('You are already in this team.');
      await api.entities.Team.update(found.id, {
        member_ids: [...members, user.id],
        member_names: [...(found.member_names || []), user.full_name || user.email],
      });
      await api.auth.updateMe({ team_id: found.id });
      setTeam({ ...found, member_ids: [...members, user.id] });
      setMode(null);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeaveTeam() {
    if (!window.confirm('Are you sure you want to leave your team?')) return;
    try {
      const updatedIds = (team.member_ids || []).filter(id => id !== user.id);
      const updatedNames = (team.member_names || []).filter((_, i) => (team.member_ids || [])[i] !== user.id);
      await api.entities.Team.update(team.id, { member_ids: updatedIds, member_names: updatedNames });
      await api.auth.updateMe({ team_id: null });
      setTeam(null);
    } catch (e) {
      console.error(e);
    }
  }

  const eventName = team ? events.find(e => e.id === team.event_id)?.event_name : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span className="font-heading text-lg font-bold text-primary">HUNT.QR</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowAccount(true)}
            className="text-sm text-muted-foreground hover:text-primary transition-colors hidden sm:block"
            title="View your account"
          >
            {user?.full_name || user?.email}
          </button>
          <button
            onClick={() => api.auth.logout('/')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </nav>

      {showAccount && (
        <AccountModal
          user={user}
          team={team}
          onClose={() => setShowAccount(false)}
          onUpdated={(updated) => setUser(updated)}
        />
      )}

      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-5xl font-bold mb-2">LOBBY</h1>
          <p className="text-muted-foreground mb-10">Join or create a team to start hunting.</p>

          {/* Current team card */}
          {team ? (
            <div className="rounded-lg border border-primary/40 bg-card p-6 glow-gold mb-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-primary font-semibold tracking-widest uppercase mb-1">Your Team</p>
                  <h2 className="font-heading text-3xl font-bold">{team.team_name}</h2>
                  {eventName && <p className="text-sm text-muted-foreground mt-1">Event: {eventName}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Invite Code</p>
                  <code className="font-mono text-2xl font-bold text-primary tracking-widest">{team.join_code}</code>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Members ({(team.member_ids || []).length}/4)</p>
                <div className="flex flex-wrap gap-2">
                  {(team.member_names || []).map((name, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 py-1 rounded-full bg-secondary text-sm">
                      {i === 0 && <Crown className="w-3 h-3 text-primary" />}
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Clue Progress</p>
                  <p className="font-heading text-xl font-bold">Level {team.current_clue_level}</p>
                </div>
                <button
                  onClick={handleLeaveTeam}
                  className="text-sm text-destructive hover:underline"
                >
                  Leave Team
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center mb-8">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">You're not on a team yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Create a new team or join one with an invite code.</p>
            </div>
          )}

          {/* Leaderboard (only meaningful once on a team) */}
          {team && <Leaderboard teamId={team.id} refreshKey={lbRefresh} />}

          {/* Actions */}
          {!team && (
            <>
              {!mode && (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setMode('create')}
                    className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-card hover:border-primary transition-colors"
                  >
                    <Plus className="w-7 h-7 text-primary" />
                    <span className="font-heading text-lg font-bold">CREATE TEAM</span>
                    <span className="text-xs text-muted-foreground text-center">Start a new team and get an invite code</span>
                  </button>
                  <button
                    onClick={() => setMode('join')}
                    className="flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-card hover:border-primary transition-colors"
                  >
                    <LogIn className="w-7 h-7 text-primary" />
                    <span className="font-heading text-lg font-bold">JOIN TEAM</span>
                    <span className="text-xs text-muted-foreground text-center">Enter a 5-character invite code</span>
                  </button>
                </div>
              )}

              {mode === 'create' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h3 className="font-heading text-2xl font-bold">CREATE A TEAM</h3>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Team Name</label>
                    <input
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      placeholder="e.g. The Night Owls"
                      className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Select Event</label>
                    <select
                      value={selectedEventId}
                      onChange={e => setSelectedEventId(e.target.value)}
                      className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Choose an event...</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.event_name}</option>
                      ))}
                    </select>
                  </div>
                  {error && <p className="text-destructive text-sm">{error}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => { setMode(null); setError(''); }} className="px-4 py-2 border border-border rounded-md text-sm hover:border-primary transition-colors">Cancel</button>
                    <button onClick={handleCreateTeam} disabled={submitting} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                      {submitting ? 'Creating...' : 'Create Team'}
                    </button>
                  </div>
                </motion.div>
              )}

              {mode === 'join' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h3 className="font-heading text-2xl font-bold">JOIN A TEAM</h3>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Invite Code</label>
                    <input
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. XK4T2"
                      maxLength={5}
                      className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground font-mono text-xl tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  {error && <p className="text-destructive text-sm">{error}</p>}
                  <div className="flex gap-3">
                    <button onClick={() => { setMode(null); setError(''); }} className="px-4 py-2 border border-border rounded-md text-sm hover:border-primary transition-colors">Cancel</button>
                    <button onClick={handleJoinTeam} disabled={submitting} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
                      {submitting ? 'Joining...' : 'Join Team'}
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}