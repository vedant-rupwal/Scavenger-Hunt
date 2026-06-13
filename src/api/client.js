import { supabase } from './supabaseClient';

/**
 * Local API client backed by Supabase.
 *
 * Exposes the same surface the app used to get from the base44 SDK
 * (`api.auth.*` and `api.entities.<Entity>.*`) so the rest of the code
 * didn't need to change. Entities map to Postgres tables; auth maps to
 * Supabase Auth. See supabase/schema.sql for the database definition.
 */

// --- helpers ---------------------------------------------------------------

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

function stripUndefined(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

// base44 sorted on a `created_date` field; Supabase tables use `created_at`.
function parseSort(sort) {
  if (!sort) return null;
  const descending = sort.startsWith('-');
  let column = descending ? sort.slice(1) : sort;
  if (column === 'created_date') column = 'created_at';
  return { column, ascending: !descending };
}

// Merge the Supabase auth user with its `profiles` row into the flat shape
// the app expects: { id, email, full_name, role, team_id }.
async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || user.email,
    screen_name: profile?.screen_name || user.user_metadata?.screen_name || null,
    role: profile?.role || 'player',
    team_id: profile?.team_id ?? null,
  };
}

// --- entities --------------------------------------------------------------

function entity(table) {
  return {
    async list(sort) {
      let query = supabase.from(table).select('*');
      const parsed = parseSort(sort);
      if (parsed) query = query.order(parsed.column, { ascending: parsed.ascending });
      return unwrap(await query);
    },

    async filter(criteria = {}) {
      let query = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(criteria)) {
        query = query.eq(key, value);
      }
      return unwrap(await query);
    },

    async create(values) {
      return unwrap(await supabase.from(table).insert(stripUndefined(values)).select().single());
    },

    async update(id, values) {
      return unwrap(
        await supabase.from(table).update(stripUndefined(values)).eq('id', id).select().single()
      );
    },

    async delete(id) {
      return unwrap(await supabase.from(table).delete().eq('id', id));
    },

    // Realtime: invoke `callback({ data: row })` on changes.
    // options.event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' (default '*')
    // options.filter: a postgres_changes filter string, e.g. `id=eq.${someId}`
    subscribe(callback, options = {}) {
      const { event = '*', filter } = options;
      const binding = { event, schema: 'public', table };
      if (filter) binding.filter = filter;
      const channel = supabase
        .channel(`realtime:${table}:${filter ?? 'all'}`)
        .on('postgres_changes', binding, (payload) => {
          callback({ data: payload.new ?? payload.old, eventType: payload.eventType });
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

// --- auth ------------------------------------------------------------------

const auth = {
  async me() {
    return getCurrentUser();
  },

  async updateMe(patch) {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) throw new Error('Not authenticated');
    unwrap(
      await supabase.from('profiles').update(stripUndefined(patch)).eq('id', user.id).select().single()
    );
    return getCurrentUser();
  },

  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  async loginViaEmailPassword(email, password) {
    return unwrap(await supabase.auth.signInWithPassword({ email, password }));
  },

  loginWithProvider(provider, redirectPath = '/lobby') {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
  },

  async register({ email, password, screen_name }) {
    return unwrap(
      await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: screen_name, screen_name } },
      })
    );
  },

  async verifyOtp({ email, otpCode }) {
    const data = unwrap(await supabase.auth.verifyOtp({ email, token: otpCode, type: 'email' }));
    return { access_token: data.session?.access_token };
  },

  // Session is established automatically by verifyOtp/signIn; kept for API parity.
  setToken() {},

  async resendOtp(email) {
    return unwrap(await supabase.auth.resend({ type: 'signup', email }));
  },

  async resetPasswordRequest(email) {
    return unwrap(
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
    );
  },

  async resetPassword({ newPassword }) {
    return unwrap(await supabase.auth.updateUser({ password: newPassword }));
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (typeof redirectUrl === 'string') {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin() {
    window.location.href = '/login';
  },
};

export const api = {
  auth,
  entities: {
    Event: entity('events'),
    Team: entity('teams'),
    Clue: entity('clues'),
    ClueAttempt: entity('clue_attempts'),
    ClueSolve: entity('clue_solves'),
  },
};
