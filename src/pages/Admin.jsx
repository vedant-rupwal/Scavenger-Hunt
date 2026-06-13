import { useState, useEffect } from 'react';
import { api } from '@/api/client';
import { useNavigate } from 'react-router-dom';
import { QrCode, Plus, LogOut, ChevronRight, Users, Trophy, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import EventDrilldown from '../components/admin/EventDrilldown';
import EventForm from '../components/admin/EventForm';

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventForm, setShowEventForm] = useState(false);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const me = await api.auth.me();
      if (me.role !== 'admin') {
        navigate('/');
        return;
      }
    } catch {
      navigate('/login');
      return;
    }
    await loadData();
  }

  async function loadData() {
    const [evs, tms] = await Promise.all([
      api.entities.Event.list('-created_date'),
      api.entities.Team.list(),
    ]);
    setEvents(evs);
    setTeams(tms);
    setLoading(false);
  }

  function getTeamsForEvent(eventId) {
    return teams.filter(t => t.event_id === eventId);
  }

  function getCompletionsForEvent(eventId) {
    return teams.filter(t => t.event_id === eventId && t.completed).length;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <EventDrilldown
        event={selectedEvent}
        onBack={() => setSelectedEvent(null)}
        onRefresh={loadData}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-primary" />
          <span className="font-heading text-lg font-bold text-primary">HUNT.QR</span>
          <span className="ml-2 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary font-semibold">ADMIN</span>
        </div>
        <button
          onClick={() => api.auth.logout('/')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h1 className="font-display text-5xl font-bold mb-1">DASHBOARD</h1>
            <p className="text-muted-foreground">Manage events, clues, and track team progress.</p>
          </div>
          <button
            onClick={() => setShowEventForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity glow-gold"
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
        </div>

        {/* Global stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Events', value: events.length, icon: Calendar },
            { label: 'Total Teams', value: teams.length, icon: Users },
            { label: 'Completions', value: teams.filter(t => t.completed).length, icon: Trophy },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-widest">{label}</span>
              </div>
              <p className="font-heading text-4xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Events table */}
        <div>
          <h2 className="font-heading text-2xl font-bold mb-4">ALL EVENTS</h2>
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium mb-1">No events yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first event to get started.</p>
              <button
                onClick={() => setShowEventForm(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-semibold"
              >
                Create Event
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">Event</th>
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">Date</th>
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">Teams</th>
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">Completions</th>
                    <th className="text-left px-5 py-3 text-xs text-muted-foreground uppercase tracking-widest font-semibold">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => {
                    const evTeams = getTeamsForEvent(ev.id);
                    const completions = getCompletionsForEvent(ev.id);
                    return (
                      <motion.tr
                        key={ev.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-border last:border-0 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => setSelectedEvent(ev)}
                      >
                        <td className="px-5 py-4 font-medium">{ev.event_name}</td>
                        <td className="px-5 py-4 text-sm text-muted-foreground">{ev.event_date || '—'}</td>
                        <td className="px-5 py-4 text-sm">{evTeams.length}</td>
                        <td className="px-5 py-4 text-sm">
                          <span className={completions > 0 ? 'text-green-400' : 'text-muted-foreground'}>
                            {completions} / {evTeams.length}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ev.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-muted text-muted-foreground'}`}>
                            {ev.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Event form modal */}
      {showEventForm && (
        <EventForm
          onClose={() => setShowEventForm(false)}
          onSaved={() => { setShowEventForm(false); loadData(); }}
        />
      )}
    </div>
  );
}