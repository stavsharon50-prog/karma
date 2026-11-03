// Data layer. Two backends with the same methods:
//   SupabaseApi — the real one (needs config.js filled in)
//   DemoApi     — runs in the browser only, with fake friends who answer you
(function () {
  const cfg = window.KARMA_CONFIG || {};
  const SUPABASE_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('script_load_failed'));
      document.head.appendChild(s);
    });
  }

  // ───────────────────────── Supabase ─────────────────────────
  class SupabaseApi {
    constructor() { this.demo = false; this.sb = null; this.user = null; }

    async init() {
      await loadScript(SUPABASE_SRC);
      this.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
      });
      const { data } = await this.sb.auth.getSession();
      this.user = data.session ? data.session.user : null;
      this.sb.auth.onAuthStateChange((_e, session) => { this.user = session ? session.user : null; });
    }

    async rpc(name, args) {
      const { data, error } = await this.sb.rpc(name, args || {});
      if (error) throw new Error(error.message);
      return data;
    }

    signedIn() { return !!this.user; }
    googleName() {
      const m = (this.user && this.user.user_metadata) || {};
      return (m.full_name || m.name || '').split(' ')[0];
    }
    async signIn() {
      const redirectTo = location.origin + location.pathname;
      const { error } = await this.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw new Error(error.message);
    }
    async signOut() { await this.sb.auth.signOut(); this.user = null; }

    async getProfile() {
      const { data, error } = await this.sb.from('profiles').select('*').eq('id', this.user.id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    upsertProfile(name, pronoun, color, age) {
      return this.rpc('upsert_profile', { p_name: name, p_pronoun: pronoun, p_color: color, p_age: age });
    }
    myInvite() { return this.rpc('my_invite'); }
    async inviteInfo(token) { const r = await this.rpc('invite_info', { p_token: token }); return r && r[0]; }
    acceptInvite(token) { return this.rpc('accept_invite', { p_token: token }); }
    myFriends() { return this.rpc('my_friends'); }
    beefsForMe() { return this.rpc('beefs_for_me'); }
    beefCount() { return this.rpc('beef_count_for_me'); }
    myBeefs() { return this.rpc('my_beefs'); }
    async createBeef(b) {
      const { data, error } = await this.sb.from('beefs').insert({
        creator: this.user.id, target: b.target, kind: b.kind, reason: b.reason, spice: b.spice, anonymous: b.anonymous,
      }).select('id').single();
      if (error) throw new Error(error.message);
      return data.id;
    }
    makeOffer(beef, type, msg) { return this.rpc('make_offer', { p_beef: beef, p_type: type, p_message: msg || null }); }
    respondOffer(offer, accept) { return this.rpc('respond_offer', { p_offer: offer, p_accept: accept }); }
    offersForBeef(beef) { return this.rpc('offers_for_beef', { p_beef: beef }); }
    closeBeef(beef, how) { return this.rpc('close_beef', { p_beef: beef, p_how: how }); }
    restoreBeef(beef) { return this.rpc('restore_beef', { p_beef: beef }); }
    requestReveal(beef) { return this.rpc('request_reveal', { p_beef: beef }); }
    respondReveal(beef, accept) { return this.rpc('respond_reveal', { p_beef: beef, p_accept: accept }); }
    reportBeef(beef, reason, block) { return this.rpc('report_beef', { p_beef: beef, p_reason: reason, p_block: block }); }
    karmaReset() { return this.rpc('karma_reset'); }
    log(name, props) {
      if (!this.user) return;
      this.sb.from('events').insert({ user_id: this.user.id, name, props: props || {} }).then(() => {}, () => {});
    }
  }

  // ───────────────────────── Demo ─────────────────────────
  const KEY = 'karma_demo_v1';
  const now = () => new Date().toISOString();
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

  function seed() {
    return {
      signedIn: false,
      me: null,
      friends: [
        { id: 'f-maya', display_name: 'מאיה', color: 'lime', pronoun: 'f' },
        { id: 'f-itai', display_name: 'איתי', color: 'pink', pronoun: 'm' },
        { id: 'f-noy', display_name: 'נוי', color: 'surface', pronoun: 'f' },
      ],
      // beefs: creator 'me' = I created it. target 'me' = about me.
      beefs: [
        { id: 'b1', creator: 'f-maya', target: 'me', kind: 'beef', reason: 'ראית סטורי ולא עשית לייק', spice: 2, anonymous: true, revealed: false, status: 'pending', created_at: ago(20), closed_at: null },
        { id: 'b2', creator: 'f-itai', target: 'me', kind: 'debt', reason: 'הקפה מיוני עדיין פתוח', spice: 1, anonymous: false, revealed: false, status: 'pending', created_at: ago(70), closed_at: null },
        { id: 'b3', creator: 'me', target: 'f-maya', kind: 'beef', reason: 'אכלה לי את הצ׳יפס', spice: 2, anonymous: false, revealed: false, status: 'in_progress', created_at: ago(140), closed_at: null },
        { id: 'b4', creator: 'me', target: 'f-noy', kind: 'promise', reason: 'הבטיחה לבוא ליום הולדת', spice: 3, anonymous: true, revealed: false, status: 'pending', created_at: ago(30), closed_at: null },
      ],
      offers: [
        { id: 'o1', beef_id: 'b3', from_user: 'f-maya', offer_type: 'coffee', message: 'נו טוב. קפה ומאפה עליי', status: 'open', created_at: ago(5) },
      ],
      reveals: [],
      seen: [],
    };
  }

  class DemoApi {
    constructor() { this.demo = true; }
    async init() {
      try { this.s = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { this.s = seed(); }
    }
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch (e) {} }
    wait(v) { return new Promise((r) => setTimeout(() => r(v), 120)); }
    friend(id) { return this.s.friends.find((f) => f.id === id); }
    beef(id) { return this.s.beefs.find((b) => b.id === id); }

    signedIn() { return this.s.signedIn; }
    googleName() { return ''; }
    async signIn() { this.s.signedIn = true; this.save(); window.dispatchEvent(new Event('hashchange')); }
    async signOut() { try { localStorage.removeItem(KEY); } catch (e) {} this.s = seed(); }
    resetDemo() { localStorage.removeItem(KEY); }

    getProfile() { return this.wait(this.s.me); }
    upsertProfile(name, pronoun, color, age) {
      if (!age) throw new Error('age_required');
      this.s.me = { id: 'me', display_name: name, pronoun, color, age_confirmed: true };
      this.save(); return this.wait(this.s.me);
    }
    myInvite() { return this.wait('demo1234'); }
    inviteInfo(t) { return this.wait(t ? { inviter: 'f-maya', display_name: 'מאיה', color: 'lime' } : null); }
    acceptInvite() { return this.wait('f-maya'); }
    myFriends() { return this.wait(this.s.friends.slice()); }

    beefsForMe() {
      const rows = this.s.beefs.filter((b) => b.target === 'me' && ['pending', 'in_progress', 'settled', 'forgiven'].includes(b.status))
        .map((b) => {
          const hidden = b.anonymous && !b.revealed;
          const c = this.friend(b.creator);
          const rv = this.s.reveals.find((r) => r.beef_id === b.id);
          return {
            id: b.id, kind: b.kind, reason: hidden ? null : b.reason, spice: b.spice, status: b.status, created_at: b.created_at,
            creator: hidden ? null : b.creator, creator_name: hidden ? null : c.display_name, creator_color: hidden ? null : c.color,
            is_match: this.s.beefs.some((m) => m.creator === 'me' && m.target === b.creator && ['pending', 'in_progress'].includes(m.status)),
            reveal_status: rv ? rv.status : null, open_offer_from_creator: false,
          };
        });
      return this.wait(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    beefCount() {
      return this.wait(Math.min(5, this.s.beefs.filter((b) => b.target === 'me' && ['pending', 'in_progress'].includes(b.status)).length));
    }
    myBeefs() {
      const rows = this.s.beefs.filter((b) => b.creator === 'me' && b.status !== 'removed').map((b) => {
        const t = this.friend(b.target);
        const rv = this.s.reveals.find((r) => r.beef_id === b.id);
        return {
          ...b, target_name: t.display_name, target_color: t.color,
          open_offer_from_target: this.s.offers.some((o) => o.beef_id === b.id && o.from_user === b.target && o.status === 'open'),
          reveal_status: rv ? rv.status : null,
        };
      });
      return this.wait(rows.sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }
    createBeef(b) {
      const open = this.s.beefs.filter((x) => x.creator === 'me' && x.target === b.target && ['pending', 'in_progress'].includes(x.status)).length;
      if (open >= 3) throw new Error('too_many_open');
      const id = uid();
      this.s.beefs.push({ id, creator: 'me', target: b.target, kind: b.kind, reason: b.reason, spice: b.spice, anonymous: b.anonymous, revealed: false, status: 'pending', created_at: now(), closed_at: null });
      this.save();
      // The demo friend answers after a short while.
      setTimeout(() => {
        const x = this.beef(id); if (!x || x.status !== 'pending') return;
        const types = ['coffee', 'apology', 'story', 'song'];
        const msgs = { coffee: 'טוב נו. קפה עליי', apology: 'סליחה סליחה סליחה', story: 'מעלה סטורי פרגון עכשיו', song: 'מקליט/ה לך שיר. תתכונני' };
        const t = types[Math.floor(Math.random() * types.length)];
        this.s.offers.push({ id: uid(), beef_id: id, from_user: x.target, offer_type: t, message: msgs[t], status: 'open', created_at: now() });
        x.status = 'in_progress'; this.save();
        window.dispatchEvent(new Event('karma:changed'));
      }, 9000);
      return this.wait(id);
    }
    makeOffer(beefId, type, message) {
      const b = this.beef(beefId);
      if (!b || !['pending', 'in_progress'].includes(b.status)) throw new Error('closed');
      const id = uid();
      this.s.offers.push({ id, beef_id: beefId, from_user: 'me', offer_type: type, message, status: 'open', created_at: now() });
      b.status = 'in_progress'; this.save();
      setTimeout(() => {
        const o = this.s.offers.find((x) => x.id === id); if (!o || o.status !== 'open') return;
        o.status = 'accepted'; b.status = 'settled'; b.closed_at = now(); this.save();
        window.dispatchEvent(new Event('karma:changed'));
      }, 7000);
      return this.wait(id);
    }
    respondOffer(offerId, accept) {
      const o = this.s.offers.find((x) => x.id === offerId); const b = this.beef(o.beef_id);
      o.status = accept ? 'accepted' : 'declined';
      if (accept) { b.status = 'settled'; b.closed_at = now(); }
      this.save(); return this.wait();
    }
    offersForBeef(beefId) {
      return this.wait(this.s.offers.filter((o) => o.beef_id === beefId).map((o) => ({
        id: o.id, mine: o.from_user === 'me', offer_type: o.offer_type, message: o.message, status: o.status, created_at: o.created_at,
      })));
    }
    closeBeef(id, how) { const b = this.beef(id); if (b && b.creator === 'me') { b.status = how; b.closed_at = now(); this.save(); } return this.wait(); }
    restoreBeef(id) { const b = this.beef(id); if (b && b.status === 'released') { b.status = 'pending'; b.closed_at = null; this.save(); } return this.wait(); }
    requestReveal(id) {
      if (!this.s.reveals.find((r) => r.beef_id === id)) this.s.reveals.push({ beef_id: id, status: 'open' });
      this.save();
      setTimeout(() => {
        const r = this.s.reveals.find((x) => x.beef_id === id); if (!r || r.status !== 'open') return;
        r.status = 'accepted'; this.beef(id).revealed = true; this.save();
        window.dispatchEvent(new Event('karma:changed'));
      }, 6000);
      return this.wait();
    }
    respondReveal(id, accept) {
      const r = this.s.reveals.find((x) => x.beef_id === id); if (r) r.status = accept ? 'accepted' : 'declined';
      if (accept) this.beef(id).revealed = true; this.save(); return this.wait();
    }
    reportBeef(id) { const b = this.beef(id); b.status = 'removed'; b.closed_at = now(); this.save(); return this.wait(); }
    karmaReset() {
      this.s.beefs.forEach((b) => { if (['pending', 'in_progress'].includes(b.status)) { b.status = 'removed'; b.closed_at = now(); } });
      this.save(); return this.wait();
    }
    log(name, props) { if (location.hostname === 'localhost') console.log('[event]', name, props || {}); }
  }

  window.KarmaApi = (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) ? new SupabaseApi() : new DemoApi();
})();
