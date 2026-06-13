import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { ArrowLeft, Plus, Pencil, Trash2, QrCode, Users, CheckCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import ClueForm from './ClueForm';
import QRModal from './QRModal';
import EventForm from './EventForm';

export default function EventDrilldown({ event, onBack, onRefresh }) {
  const [clues, setClues] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClueForm, setShowClueForm] = useState(false);
  const [editingClue, setEditingClue] = useState(null);
  const [qrClue, setQrClue] = useState(null);
  const [editingEvent, setEditingEvent] = useState(false);

  useEffect(() => {
    loadData();
    // Real-time subscription for teams
    const unsub = api.entities.Team.subscribe(ev => {
      if (ev.data?.event_id === event.id) {
        loadTeams();
      }
    });
    return unsub;
  }, [event.id]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadClues(), loadTeams()]);
    setLoading(false);
  }

  async function loadClues() {
    const c = await api.entities.Clue.filter({ event_id: event.id });
    setClues(c.sort((a, b) => a.clue_number - b.clue_number));
  }

  async function loadTeams() {
    const t = await api.entities.Team.filter({ event_id: event.id });
    setTeams(t);
  }

  async function handleDeleteClue(clue) {
    if (!window.confirm(`Delete Clue #${clue.clue_number}? This cannot be undone.`)) return;
    await api.entities.Clue.delete(clue.id);
    loadClues();
  }

  const totalClues = clues.length;
  const baseUrl = window.location.origin;

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
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" /> All Events
        </button>
        <div className="flex gap-3">
          <button onClick={loadData} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditingEvent(true)}
            className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-border rounded-md hover:border-primary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit Event
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Event header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${event.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'}`}>
              {event.status}
            </span>
            {event.event_date && <span className="text-sm text-muted-foreground">{event.event_date}</span>}
          </div>
          <h1 className="font-display text-5xl font-bold">{event.event_name}</h1>
          {event.description && <p className="text-muted-foreground mt-2">{event.description}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Teams', value: teams.length, icon: Users },
            { label: 'Clues', value: totalClues, icon: QrCode },
            { label: 'Completions', value: teams.filter(t => t.completed).length, icon: CheckCircle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
              </div>
              <p className="font-heading text-3xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Clues panel */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold">CLUES</h2>
              <button
                onClick={() => { setEditingClue(null); setShowClueForm(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:opacity-90"
              >
                <Plus className="w-4 h-4" /> Add Clue
              </button>
            </div>

            {clues.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <QrCode className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm mb-3">No clues yet — add your first clue.</p>
                <button onClick={() => setShowClueForm(true)} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-semibold">Add Clue</button>
              </div>
            ) : (
              <div className="space-y-3">
                {clues.map((clue, i) => (
                  <motion.div
                    key={clue.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-card border border-border rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">#{clue.clue_number}</span>
                          <span className="text-xs text-muted-foreground font-mono">→ {clue.reward_letter}</span>
                        </div>
                        <p className="text-sm leading-snug line-clamp-2">{clue.riddle_text}</p>
                        <p className="text-xs text-muted-foreground mt-1">Answer: <span className="text-foreground">{clue.correct_answer}</span></p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setQrClue(clue)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                          title="Generate QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingClue(clue); setShowClueForm(true); }}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClue(clue)}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Teams panel */}
          <div>
            <h2 className="font-heading text-2xl font-bold mb-4">TEAMS (LIVE)</h2>
            {teams.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No teams have joined this event yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {teams.map((team, i) => {
                  const progress = totalClues > 0 ? Math.min(((team.current_clue_level - 1) / totalClues) * 100, 100) : 0;
                  return (
                    <motion.div
                      key={team.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-card border border-border rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{team.team_name}</p>
                            {team.completed && (
                              <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                                <CheckCircle className="w-3 h-3" /> Done
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(team.member_names || []).join(', ')}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">#{team.join_code}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Clue {team.current_clue_level} of {totalClues || '?'}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                      {(team.collected_letters || []).length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {(team.collected_letters || []).map((l, idx) => (
                            <span key={idx} className="inline-flex items-center justify-center w-6 h-6 rounded bg-primary/10 border border-primary/30 text-primary text-xs font-bold font-mono">
                              {l}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showClueForm && (
        <ClueForm
          eventId={event.id}
          existingClue={editingClue}
          onClose={() => { setShowClueForm(false); setEditingClue(null); }}
          onSaved={() => { setShowClueForm(false); setEditingClue(null); loadClues(); }}
        />
      )}
      {qrClue && (
        <QRModal
          clue={qrClue}
          baseUrl={baseUrl}
          onClose={() => setQrClue(null)}
        />
      )}
      {editingEvent && (
        <EventForm
          existingEvent={event}
          onClose={() => setEditingEvent(false)}
          onSaved={() => { setEditingEvent(false); onRefresh(); }}
        />
      )}
    </div>
  );
}