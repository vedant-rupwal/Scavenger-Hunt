import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '@/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Lock, QrCode, ArrowRight, Home } from 'lucide-react';

export default function Clue() {
  const { clueId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState('loading'); // loading | auth_required | wrong_level | active | correct | already_done | no_clue
  const [clue, setClue] = useState(null);
  const [team, setTeam] = useState(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // null | 'correct' | 'wrong'
  const [rewardLetter, setRewardLetter] = useState('');
  const [allLetters, setAllLetters] = useState([]);
  const [attempt, setAttempt] = useState(null); // this team's attempt counter for this clue
  const [me, setMe] = useState(null); // the logged-in user (for solve attribution)

  useEffect(() => {
    checkAndLoad();
  }, [clueId]);

  async function checkAndLoad() {
    try {
      const isAuthed = await api.auth.isAuthenticated();
      if (!isAuthed) {
        setState('auth_required');
        return;
      }

      const me = await api.auth.me();
      setMe(me);
      if (!me.team_id) {
        setState('no_team');
        return;
      }

      // Load clue
      const clues = await api.entities.Clue.filter({ id: clueId });
      if (clues.length === 0) {
        setState('no_clue');
        return;
      }
      const foundClue = clues[0];
      setClue(foundClue);

      // Load team
      const teams = await api.entities.Team.filter({ id: me.team_id });
      if (teams.length === 0) {
        setState('no_team');
        return;
      }
      const foundTeam = teams[0];
      setTeam(foundTeam);

      const level = foundTeam.current_clue_level || 1;
      const letters = foundTeam.collected_letters || [];

      // Check if they've already completed this clue (clue number < current level)
      if (foundClue.clue_number < level) {
        setAllLetters(letters);
        setState('already_done');
        return;
      }

      // Check if team is on this clue
      if (foundClue.clue_number !== level) {
        setState('wrong_level');
        return;
      }

      // Load (or create) this team's attempt counter for this clue.
      let att = (await api.entities.ClueAttempt.filter({
        team_id: foundTeam.id,
        clue_id: foundClue.id,
      }))[0];
      if (!att) {
        att = await api.entities.ClueAttempt.create({
          team_id: foundTeam.id,
          clue_id: foundClue.id,
          attempts_used: 0,
          attempts_allowed: 5,
        });
      }
      setAttempt(att);

      if (att.attempts_used >= att.attempts_allowed) {
        setState('out_of_attempts');
        return;
      }

      setState('active');
    } catch (e) {
      console.error(e);
      setState('error');
    }
  }

  async function handleSubmit() {
    if (!answer.trim()) return;
    setSubmitting(true);
    setFeedback(null);

    const normalized = answer.trim().toLowerCase();
    const correct = clue.correct_answer.trim().toLowerCase();

    if (normalized !== correct) {
      // Wrong guess — burn an attempt and lock the team out if they're spent.
      try {
        const used = (attempt?.attempts_used ?? 0) + 1;
        const updated = await api.entities.ClueAttempt.update(attempt.id, { attempts_used: used });
        setAttempt(updated);
        if (used >= updated.attempts_allowed) {
          setState('out_of_attempts');
        } else {
          setFeedback('wrong');
        }
      } catch (e) {
        console.error(e);
        setFeedback('wrong');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Correct! Update team progress
    try {
      const letters = [...(team.collected_letters || []), clue.reward_letter];
      const nextLevel = clue.clue_number + 1;

      // Check if this was the last clue
      const allClues = await api.entities.Clue.filter({ event_id: team.event_id });
      const maxClue = Math.max(...allClues.map(c => c.clue_number));
      const isLast = clue.clue_number === maxClue;

      const solverName = me?.screen_name || me?.full_name || me?.email || 'A teammate';

      // Record who solved this clue (powers the leaderboard) BEFORE updating the
      // team, so the row exists by the time teammates get the realtime update.
      await api.entities.ClueSolve.create({
        team_id: team.id,
        clue_id: clue.id,
        solved_by_id: me?.id,
        solved_by_name: solverName,
      });

      await api.entities.Team.update(team.id, {
        current_clue_level: nextLevel,
        collected_letters: letters,
        completed: isLast,
        completed_at: isLast ? new Date().toISOString() : undefined,
        last_solved_by: solverName,
      });

      setRewardLetter(clue.reward_letter);
      setAllLetters(letters);
      setFeedback('correct');
      setState(isLast ? 'completed' : 'correct');
    } catch (e) {
      console.error(e);
      setFeedback('wrong');
    } finally {
      setSubmitting(false);
    }
  }

  // --- Render states ---

  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (state === 'auth_required') {
    return (
      <GateScreen
        icon={<Lock className="w-12 h-12 text-primary" />}
        title="SIGN IN TO PLAY"
        desc="You need to be logged in to view this clue."
        action={<Link to="/login" className="px-6 py-3 bg-primary text-primary-foreground font-heading text-lg font-bold rounded-lg hover:opacity-90">Sign In</Link>}
      />
    );
  }

  if (state === 'no_team') {
    return (
      <GateScreen
        icon={<QrCode className="w-12 h-12 text-primary" />}
        title="JOIN A TEAM FIRST"
        desc="You need to be on a team to participate in the hunt."
        action={<Link to="/lobby" className="px-6 py-3 bg-primary text-primary-foreground font-heading text-lg font-bold rounded-lg hover:opacity-90">Go to Lobby</Link>}
      />
    );
  }

  if (state === 'no_clue') {
    return (
      <GateScreen
        icon={<XCircle className="w-12 h-12 text-destructive" />}
        title="CLUE NOT FOUND"
        desc="This clue doesn't exist or has been removed."
        action={<Link to="/lobby" className="px-6 py-3 bg-primary text-primary-foreground font-heading text-lg font-bold rounded-lg hover:opacity-90">Back to Lobby</Link>}
      />
    );
  }

  if (state === 'wrong_level') {
    return (
      <GateScreen
        icon={<Lock className="w-12 h-12 text-primary" />}
        title="NOT YET..."
        desc={`Your team isn't on this clue yet. You're currently on clue #${team?.current_clue_level}.`}
        action={<Link to="/lobby" className="px-6 py-3 bg-primary text-primary-foreground font-heading text-lg font-bold rounded-lg hover:opacity-90">Back to Lobby</Link>}
      />
    );
  }

  if (state === 'out_of_attempts') {
    return (
      <GateScreen
        icon={<XCircle className="w-12 h-12 text-destructive" />}
        title="OUT OF ATTEMPTS"
        desc={`Your team has used all ${attempt?.attempts_allowed ?? 5} attempts on this clue. Ask the host for more attempts to keep going.`}
        action={<Link to="/lobby" className="px-6 py-3 bg-primary text-primary-foreground font-heading text-lg font-bold rounded-lg hover:opacity-90">Back to Lobby</Link>}
      />
    );
  }

  if (state === 'already_done') {
    return (
      <GateScreen
        icon={<CheckCircle className="w-12 h-12 text-green-500" />}
        title="ALREADY SOLVED!"
        desc="Your team has already completed this clue."
        sub={<div className="flex gap-2 mt-4 flex-wrap justify-center">{allLetters.map((l, i) => <LetterBadge key={i} letter={l} delay={i * 0.1} />)}</div>}
        action={<Link to="/lobby" className="px-6 py-3 bg-primary text-primary-foreground font-heading text-lg font-bold rounded-lg hover:opacity-90">Back to Lobby</Link>}
      />
    );
  }

  if (state === 'completed') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
          <div className="text-6xl mb-6">🏆</div>
          <h1 className="font-display text-6xl font-bold text-primary text-glow-gold mb-4">HUNT COMPLETE!</h1>
          <p className="text-muted-foreground text-lg mb-8">Incredible — your team solved every clue! Here are all your collected letters:</p>
          <div className="flex gap-3 flex-wrap justify-center mb-6">
            {allLetters.map((l, i) => <LetterBadge key={i} letter={l} delay={i * 0.15} large />)}
          </div>
          <div className="bg-card border border-primary/40 rounded-lg p-6 glow-gold mb-8">
            <p className="text-sm text-muted-foreground mb-2 uppercase tracking-widest">The Final Word</p>
            <p className="font-display text-5xl font-bold text-primary tracking-widest">{allLetters.join('')}</p>
          </div>
          <Link to="/lobby" className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg hover:border-primary text-foreground transition-colors">
            <Home className="w-4 h-4" /> Back to Lobby
          </Link>
        </motion.div>
      </div>
    );
  }

  // Active clue
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="border-b border-border px-6 py-3 flex items-center justify-between">
        <Link to="/lobby" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <Home className="w-4 h-4" /> Lobby
        </Link>
        <span className="font-heading text-sm text-primary tracking-widest">CLUE #{clue?.clue_number}</span>
        <span className="text-sm text-muted-foreground">{team?.team_name}</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl w-full"
        >
          {/* Clue number badge */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold tracking-widest uppercase">
              CLUE #{clue?.clue_number}
            </span>
          </div>

          {/* Riddle */}
          <div className="bg-card border border-border rounded-xl p-8 mb-8 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">The Riddle</p>
            <blockquote className="font-display text-3xl md:text-4xl font-bold leading-tight text-foreground">
              "{clue?.riddle_text}"
            </blockquote>
            {clue?.hint && (
              <p className="mt-4 text-sm text-muted-foreground italic">Hint: {clue.hint}</p>
            )}
          </div>

          {/* Answer form */}
          <div className="space-y-4">
            {attempt && state !== 'correct' && (
              <p className="text-center text-sm text-muted-foreground">
                <span className={attempt.attempts_allowed - attempt.attempts_used <= 2 ? 'text-destructive font-semibold' : 'text-primary font-semibold'}>
                  {attempt.attempts_allowed - attempt.attempts_used}
                </span>{' '}
                of {attempt.attempts_allowed} attempts left
              </p>
            )}
            <input
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !submitting && handleSubmit()}
              placeholder="Type your answer here..."
              disabled={state === 'correct'}
              className="w-full bg-input border border-border rounded-lg px-5 py-4 text-foreground text-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all disabled:opacity-50"
            />

            <AnimatePresence>
              {feedback === 'wrong' && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive glow-red"
                >
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Not quite — try again!</span>
                </motion.div>
              )}

              {feedback === 'correct' && state === 'correct' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 glow-green"
                >
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Correct! You earned the letter:</p>
                    <LetterBadge letter={rewardLetter} delay={0.2} large />
                  </div>
                  <Link to="/lobby" className="ml-auto flex items-center gap-1 text-sm text-primary hover:underline font-semibold">
                    Continue <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>

            {state !== 'correct' && (
              <button
                onClick={handleSubmit}
                disabled={submitting || !answer.trim()}
                className="w-full py-4 bg-primary text-primary-foreground font-heading text-xl font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 glow-gold"
              >
                {submitting ? 'CHECKING...' : 'SUBMIT ANSWER'}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function GateScreen({ icon, title, desc, sub, action }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-sm">
        <div className="mb-4 flex justify-center">{icon}</div>
        <h1 className="font-display text-4xl font-bold mb-3">{title}</h1>
        <p className="text-muted-foreground mb-6">{desc}</p>
        {sub}
        {action && <div className="mt-6">{action}</div>}
      </motion.div>
    </div>
  );
}

function LetterBadge({ letter, delay = 0, large = false }) {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -10, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ delay, type: 'spring', stiffness: 300, damping: 15 }}
      className={`inline-flex items-center justify-center font-display font-bold bg-primary/10 border-2 border-primary text-primary rounded-md glow-gold ${large ? 'w-14 h-14 text-3xl' : 'w-10 h-10 text-xl'}`}
    >
      {letter}
    </motion.span>
  );
}