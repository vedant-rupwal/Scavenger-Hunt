import { useState } from 'react';
import { api } from '@/api/client';
import { X } from 'lucide-react';

export default function ClueForm({ eventId, existingClue, onClose, onSaved }) {
  const [clueNumber, setClueNumber] = useState(existingClue?.clue_number?.toString() || '');
  const [riddleText, setRiddleText] = useState(existingClue?.riddle_text || '');
  const [correctAnswer, setCorrectAnswer] = useState(existingClue?.correct_answer || '');
  const [rewardLetter, setRewardLetter] = useState(existingClue?.reward_letter || '');
  const [hint, setHint] = useState(existingClue?.hint || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!clueNumber || !riddleText.trim() || !correctAnswer.trim() || !rewardLetter.trim()) {
      return setError('All fields except hint are required.');
    }
    if (rewardLetter.trim().length !== 1) {
      return setError('Reward letter must be exactly 1 character.');
    }
    setSaving(true);
    try {
      const data = {
        event_id: eventId,
        clue_number: parseInt(clueNumber),
        riddle_text: riddleText.trim(),
        correct_answer: correctAnswer.trim().toLowerCase(),
        reward_letter: rewardLetter.trim().toUpperCase(),
        hint: hint.trim(),
      };
      if (existingClue) {
        await api.entities.Clue.update(existingClue.id, data);
      } else {
        await api.entities.Clue.create(data);
      }
      onSaved();
    } catch (e) {
      setError('Failed to save clue.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-2xl font-bold">{existingClue ? 'EDIT CLUE' : 'ADD CLUE'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Clue Number (Order) *</label>
            <input
              type="number"
              min="1"
              value={clueNumber}
              onChange={e => setClueNumber(e.target.value)}
              placeholder="e.g. 1"
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Riddle Text *</label>
            <textarea
              value={riddleText}
              onChange={e => setRiddleText(e.target.value)}
              placeholder="I have cities, but no houses live there..."
              rows={4}
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Correct Answer * <span className="text-xs">(case-insensitive)</span></label>
            <input
              value={correctAnswer}
              onChange={e => setCorrectAnswer(e.target.value)}
              placeholder="e.g. a map"
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Reward Letter * <span className="text-xs">(single character)</span></label>
            <input
              value={rewardLetter}
              onChange={e => setRewardLetter(e.target.value.slice(0, 1).toUpperCase())}
              placeholder="e.g. H"
              maxLength={1}
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground font-mono text-2xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Hint (Optional)</label>
            <input
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="Optional hint shown below the riddle"
              className="w-full bg-input border border-border rounded-md px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 border border-border rounded-md text-sm hover:border-primary transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary text-primary-foreground rounded-md font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Saving...' : existingClue ? 'Save Changes' : 'Add Clue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}