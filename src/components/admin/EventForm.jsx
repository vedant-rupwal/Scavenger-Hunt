import { useState } from 'react';
import { api } from '@/api/client';
import { X } from 'lucide-react';

export default function EventForm({ onClose, onSaved, existingEvent }) {
  const [name, setName] = useState(existingEvent?.event_name || '');
  const [date, setDate] = useState(existingEvent?.event_date || '');
  const [description, setDescription] = useState(existingEvent?.description || '');
  const [status, setStatus] = useState(existingEvent?.status || 'active');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) return setError('Event name is required.');
    setSaving(true);
    try {
      const data = { event_name: name.trim(), event_date: date, description, status };
      if (existingEvent) {
        await api.entities.Event.update(existingEvent.id, data);
      } else {
        await api.entities.Event.create(data);
      }
      onSaved();
    } catch (e) {
      setError('Failed to save event.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-2xl font-bold">{existingEvent ? 'EDIT EVENT' : 'NEW EVENT'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Event Name *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Summer Scavenger Hunt 2026"
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Event Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of the event..."
              rows={3}
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm hover:border-primary transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Saving...' : existingEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}