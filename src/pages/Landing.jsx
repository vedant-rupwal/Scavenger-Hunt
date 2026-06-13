import { Link } from 'react-router-dom';
import { QrCode, Users, Trophy, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { api } from '@/api/client';

export default function Landing() {
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    api.auth.isAuthenticated().then(async (ok) => {
      if (ok) {
        setAuthed(true);
        try {
          const me = await api.auth.me();
          if (me.role === 'admin') setIsAdmin(true);
        } catch {}
      }
    });
  }, []);

  const playHref = authed ? (isAdmin ? '/admin' : '/lobby') : '/register';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-6 h-6 text-primary" />
          <span className="font-heading text-xl font-bold tracking-wide text-primary">HUNT.QR</span>
        </div>
        <div className="flex gap-3">
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link to="/register" className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold tracking-widest uppercase mb-6">
            <Zap className="w-3 h-3" /> QR Scavenger Hunt Platform
          </div>
          <h1 className="font-display text-6xl md:text-8xl font-bold tracking-tight text-foreground mb-4 leading-none text-glow-gold">
            THE HUNT<br />
            <span className="text-primary">BEGINS.</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-xl mx-auto mb-10">
            Build immersive QR code scavenger hunts for any event. Teams race to solve riddles, collect letters, and crack the final code.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to={playHref}
              className="px-8 py-3 bg-primary text-primary-foreground font-heading text-lg font-bold rounded-lg hover:opacity-90 transition-opacity glow-gold"
            >
              {authed ? 'ENTER LOBBY' : 'PLAY NOW'}
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border border-border text-foreground font-heading text-lg font-bold rounded-lg hover:border-primary transition-colors"
            >
              SIGN IN
            </Link>
          </div>
        </motion.div>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full"
        >
          {[
            { icon: QrCode, title: 'QR Clue Chains', desc: 'Each QR code leads to a riddle. Solve it to unlock the next location.' },
            { icon: Users, title: 'Team Play', desc: 'Form teams of up to 4 players. First to answer correctly advances the team.' },
            { icon: Trophy, title: 'Final Puzzle', desc: 'Collect reward letters from each clue to crack the ultimate final answer.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors text-left">
              <Icon className="w-8 h-8 text-primary mb-3" />
              <h3 className="font-heading text-xl font-bold mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      </main>

      <footer className="border-t border-border py-6 text-center text-muted-foreground text-sm">
        © 2026 Hunt.QR — Scavenger Hunt Platform
      </footer>
    </div>
  );
}