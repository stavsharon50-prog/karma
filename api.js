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
    myId() { return this.user && this.user.id; }
    // wishlist
    updateLikes(likes, birthday) { return this.rpc('update_likes', { p_likes: likes, p_birthday: birthday || '' }); }
    async friendProfile(id) { const r = await this.rpc('friend_profile', { p_friend: id }); return r && r[0]; }
    friendTimeline(id) { return this.rpc('friend_timeline', { p_friend: id }); }
    // bets
    createBet(b) {
      return this.rpc('create_bet', { p_opponent: b.opponent, p_topic: b.topic, p_my_side: b.mySide, p_their_side: b.theirSide,
        p_category: b.category, p_stake: b.stake, p_stake_text: b.stakeText || '', p_resolve_on: b.resolveOn });
    }
    respondBet(id, answer, stake, stakeText) { return this.rpc('respond_bet', { p_bet: id, p_answer: answer, p_stake: stake || null, p_stake_text: stakeText || '' }); }
    claimBet(id, winner) { return this.rpc('claim_bet', { p_bet: id, p_winner: winner }); }
    markBetPaid(id) { return this.rpc('mark_bet_paid', { p_bet: id }); }
    cancelBet(id) { return this.rpc('cancel_bet', { p_bet: id }); }
    myBets() { return this.rpc('my_bets'); }
    // good karma
    sendKarma(k) {
      return this.rpc('send_karma', { p_recipient: k.recipient, p_kind: k.kind, p_occasion: k.occasion || '', p_message: k.message || '',
        p_gift: k.gift || 'words', p_anonymous: !!k.anonymous, p_deliver_at: k.deliverAt || null, p_pass_from: k.passFrom || null });
    }
    karmaInbox() { return this.rpc('karma_inbox'); }
    karmaSent() { return this.rpc('karma_sent'); }
    cancelKarma(id) { return this.rpc('cancel_karma', { p_karma: id }); }
    thankKarma(id) { return this.rpc('thank_karma', { p_karma: id }); }
    requestKarmaReveal(id) { return this.rpc('request_karma_reveal', { p_karma: id }); }
    respondKarmaReveal(id, yes) { return this.rpc('respond_karma_reveal', { p_karma: id, p_accept: yes }); }
    // group cards
    createGroupCard(c) {
      return this.rpc('create_group_card', { p_recipient: c.recipient, p_title: c.title, p_closes_at: c.closesAt, p_message: c.message || '', p_invitees: c.invitees || [] });
    }
    joinGroupCard(id, msg) { return this.rpc('join_group_card', { p_card: id, p_message: msg || '' }); }
    deliverGroupCard(id) { return this.rpc('deliver_group_card', { p_card: id }); }
    myGroupCards() { return this.rpc('my_group_cards'); }
    groupCardsForMe() { return this.rpc('group_cards_for_me'); }
    groupCardMessages(id) { return this.rpc('group_card_messages', { p_card: id }); }
    log(name, props) {
      if (!this.user) return;
      this.sb.from('events').insert({ user_id: this.user.id, name, props: props || {} }).then(() => {}, () => {});
    }
  }

  // ───────────────────────── Demo ─────────────────────────
  const KEY = 'karma_demo_v1';
  const now = () => new Date().toISOString();
  const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  const dayPlus = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
  const hourPlus = (h) => new Date(Date.now() + h * 3600e3).toISOString();
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
      likes: {}, birthday: '',
      friendLikes: {
        'f-maya': { likes: { coffee: 'אמריקנו קר', sweet: 'עוגת גבינה', places: ['ארומה'], tags: ['ספרים', 'פרחים'] }, birthday: '11-09' },
        'f-itai': { likes: { coffee: 'אספרסו כפול', sweet: 'קרפ נוטלה', places: ['ברטון'], tags: ['סושי'] }, birthday: '12-02' },
      },
      bets: [
        { id: 'bt1', creator: 'f-maya', opponent: 'me', topic: 'מכבי לוקחת אליפות השנה', creator_side: 'כן', opponent_side: 'לא', category: 'sport', stake: 'coffee', stake_text: null, resolve_on: dayPlus(200), status: 'proposed', awaiting: 'me', creator_claim: null, opponent_claim: null, winner: null, paid: false, created_at: ago(3) },
        { id: 'bt2', creator: 'me', opponent: 'f-itai', topic: 'איתי לא מחזיק חודש בחדר כושר', creator_side: 'לא יחזיק', opponent_side: 'יחזיק', category: 'personal', stake: 'song', stake_text: null, resolve_on: dayPlus(1), status: 'active', awaiting: null, creator_claim: null, opponent_claim: null, winner: null, paid: false, created_at: ago(700) },
        { id: 'bt3', creator: 'f-noy', opponent: 'me', topic: 'מי עוזבת את האח הגדול השבוע', creator_side: 'שני', opponent_side: 'דנה', category: 'reality', stake: 'apology', stake_text: null, resolve_on: dayPlus(-2), status: 'resolved', awaiting: null, creator_claim: 'me', opponent_claim: 'me', winner: 'me', paid: false, created_at: ago(300) },
      ],
      karma: [
        { id: 'kk1', sender: 'f-noy', recipient: 'me', kind: 'karma', occasion: 'סתם כי התגעגעתי', message: 'מתגעגעת לשיחות שלנו בחצות', gift: 'words', anonymous: false, revealed: false, reveal_status: null, chain_len: 12, passed: false, thanked: false, deliver_at: ago(2), created_at: ago(2) },
        { id: 'kk2', sender: 'f-itai', recipient: 'me', kind: 'compliment', occasion: null, message: 'הכי מצחיק/ה בקבוצה', gift: 'words', anonymous: true, revealed: false, reveal_status: null, chain_len: 1, passed: true, thanked: false, deliver_at: ago(26), created_at: ago(26) },
      ],
      cards: [
        { id: 'gc1', creator: 'f-itai', recipient: 'f-maya', title: 'מגש פירות ענק ליולדת', closes_at: hourPlus(30), delivered: false, created_at: ago(5),
          members: [{ user_id: 'f-itai', message: 'מזל טוב!! מתי מבקרים?', joined_at: ago(5) }, { user_id: 'f-noy', message: 'הכי מגיע לך בעולם', joined_at: ago(3) }, { user_id: 'me', message: null, joined_at: null }] },
      ],
    };
  }

  class DemoApi {
    constructor() { this.demo = true; }
    async init() {
      try { this.s = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { this.s = seed(); }
      this.ensure();
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
    modCheck(t) { const c = window.KarmaModeration && window.KarmaModeration.check(t); if (c) throw new Error('moderation:' + c); }
    upsertProfile(name, pronoun, color, age) {
      if (!age) throw new Error('age_required');
      this.modCheck(name);
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
      this.modCheck(b.reason);
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
      this.modCheck(message);
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
    myId() { return 'me'; }
    ensure() {
      const d = seed();
      for (const k of ['likes', 'birthday', 'friendLikes', 'bets', 'karma', 'cards']) if (this.s[k] === undefined) this.s[k] = d[k];
    }
    later(ms, fn) { setTimeout(() => { fn(); this.save(); window.dispatchEvent(new Event('karma:changed')); }, ms); }
    person(id) { return id === 'me' ? { id: 'me', display_name: (this.s.me || {}).display_name || 'אני', color: (this.s.me || {}).color || 'pink', pronoun: (this.s.me || {}).pronoun || 'f' } : this.friend(id); }

    // wishlist
    updateLikes(likes, birthday) { this.modCheck(JSON.stringify(likes)); this.s.likes = likes; this.s.birthday = birthday || ''; this.save(); return this.wait(); }
    friendProfile(id) {
      if (id === 'me') return this.wait({ ...this.person('me'), likes: this.s.likes, birthday: this.s.birthday });
      const f = this.friend(id); if (!f) return this.wait(null);
      const l = this.s.friendLikes[id] || {};
      return this.wait({ ...f, likes: l.likes || {}, birthday: l.birthday || null });
    }
    friendTimeline(id) {
      const out = [];
      for (const k of this.s.karma) {
        if (new Date(k.deliver_at) > new Date() || (k.anonymous && !k.revealed)) continue;
        if ((k.sender === 'me' && k.recipient === id) || (k.sender === id && k.recipient === 'me')) out.push({ item: 'karma', mine: k.sender === 'me', title: k.occasion || k.message || 'קארמה טובה', status: null, at: k.deliver_at });
      }
      for (const b of this.s.beefs) {
        if (['removed', 'released'].includes(b.status)) continue;
        if (b.creator === 'me' && b.target === id) out.push({ item: 'beef', mine: true, title: b.reason, status: b.status, at: b.created_at });
        if (b.creator === id && b.target === 'me' && (!b.anonymous || b.revealed)) out.push({ item: 'beef', mine: false, title: b.reason, status: b.status, at: b.created_at });
      }
      for (const b of this.s.bets) {
        if (!['active', 'resolved', 'disputed'].includes(b.status)) continue;
        if ([b.creator, b.opponent].includes('me') && [b.creator, b.opponent].includes(id)) out.push({ item: 'bet', mine: b.winner === 'me', title: b.topic, status: b.status, at: b.created_at });
      }
      return this.wait(out.sort((a, b) => b.at.localeCompare(a.at)));
    }

    // bets
    bet(id) { return this.s.bets.find((b) => b.id === id); }
    createBet(b) {
      [b.topic, b.mySide, b.theirSide, b.stakeText].forEach((t) => this.modCheck(t));
      const id = uid();
      this.s.bets.push({ id, creator: 'me', opponent: b.opponent, topic: b.topic, creator_side: b.mySide, opponent_side: b.theirSide, category: b.category, stake: b.stake, stake_text: b.stakeText || null, resolve_on: b.resolveOn, status: 'proposed', awaiting: b.opponent, creator_claim: null, opponent_claim: null, winner: null, paid: false, created_at: now() });
      this.save();
      this.later(8000, () => { const x = this.bet(id); if (x && x.status === 'proposed') { x.status = 'active'; x.awaiting = null; } });
      return this.wait(id);
    }
    respondBet(id, answer, stake, stakeText) {
      const b = this.bet(id); if (!b || b.status !== 'proposed' || b.awaiting !== 'me') throw new Error('not allowed');
      if (answer === 'accept') { b.status = 'active'; b.awaiting = null; }
      else if (answer === 'decline') { b.status = 'declined'; b.awaiting = null; }
      else { this.modCheck(stakeText); b.stake = stake; b.stake_text = stakeText || null; b.awaiting = b.creator === 'me' ? b.opponent : b.creator;
        this.later(7000, () => { if (b.status === 'proposed') { b.status = 'active'; b.awaiting = null; } }); }
      this.save(); return this.wait();
    }
    claimBet(id, winner) {
      const b = this.bet(id); if (!b || !['active', 'disputed'].includes(b.status)) throw new Error('not allowed');
      if (b.creator === 'me') b.creator_claim = winner; else b.opponent_claim = winner;
      const settle = () => {
        if (b.creator_claim && b.opponent_claim) {
          if (b.creator_claim === b.opponent_claim) { b.status = 'resolved'; b.winner = b.creator_claim; } else b.status = 'disputed';
        }
      };
      settle(); this.save();
      if (b.status !== 'resolved') this.later(5000, () => { if (b.creator === 'me') b.opponent_claim = winner; else b.creator_claim = winner; settle(); });
      return this.wait(b.status === 'resolved' ? 'resolved' : 'waiting');
    }
    markBetPaid(id) { const b = this.bet(id); if (b && b.winner === 'me') { b.paid = true; this.save(); } return this.wait(); }
    cancelBet(id) { const b = this.bet(id); if (b && b.creator === 'me' && b.status === 'proposed') { b.status = 'cancelled'; this.save(); } return this.wait(); }
    myBets() {
      return this.wait(this.s.bets.filter((b) => [b.creator, b.opponent].includes('me') && b.status !== 'cancelled').map((b) => {
        const mine = b.creator === 'me'; const o = this.person(mine ? b.opponent : b.creator);
        return { id: b.id, other: o.id, other_name: o.display_name, other_color: o.color, other_pronoun: o.pronoun, i_created: mine, topic: b.topic,
          my_side: mine ? b.creator_side : b.opponent_side, their_side: mine ? b.opponent_side : b.creator_side, category: b.category,
          stake: b.stake, stake_text: b.stake_text, resolve_on: b.resolve_on, status: b.status, awaiting_me: b.awaiting === 'me',
          my_claim: mine ? b.creator_claim : b.opponent_claim, their_claim: mine ? b.opponent_claim : b.creator_claim,
          i_won: b.winner ? b.winner === 'me' : null, paid: b.paid, created_at: b.created_at };
      }).sort((a, b) => b.created_at.localeCompare(a.created_at)));
    }

    // good karma
    sendKarma(k) {
      this.modCheck(k.occasion); this.modCheck(k.message);
      if (k.passFrom) {
        const src = this.s.karma.find((x) => x.id === k.passFrom && x.recipient === 'me' && !x.passed);
        if (!src) throw new Error('chain_expired');
        src.passed = true;
      }
      const id = uid();
      this.s.karma.push({ id, sender: 'me', recipient: k.recipient, kind: k.kind || 'karma', occasion: k.occasion || null, message: k.message || null, gift: k.gift || 'words',
        anonymous: !!k.anonymous || k.kind === 'compliment', revealed: false, reveal_status: null, chain_len: 1, passed: false, thanked: false,
        deliver_at: k.deliverAt && new Date(k.deliverAt) > new Date() ? new Date(k.deliverAt).toISOString() : now(), created_at: now() });
      this.save();
      this.later(9000, () => { const x = this.s.karma.find((y) => y.id === id); if (x && new Date(x.deliver_at) <= new Date()) x.thanked = true; });
      return this.wait(id);
    }
    karmaInbox() {
      return this.wait(this.s.karma.filter((k) => k.recipient === 'me' && new Date(k.deliver_at) <= new Date()).map((k) => {
        const hidden = k.anonymous && !k.revealed; const p = this.person(k.sender);
        return { id: k.id, kind: k.kind, occasion: k.occasion, message: k.message, gift: k.gift, sender: hidden ? null : k.sender,
          sender_name: hidden ? null : p.display_name, sender_color: hidden ? null : p.color, anonymous: hidden, reveal_status: k.reveal_status,
          thanked: k.thanked, can_pass: !k.passed && (Date.now() - new Date(k.deliver_at)) < 864e5,
          pass_until: new Date(new Date(k.deliver_at).getTime() + 864e5).toISOString(), chain_length: k.chain_len || 1, delivered_at: k.deliver_at };
      }).sort((a, b) => b.delivered_at.localeCompare(a.delivered_at)));
    }
    karmaSent() {
      return this.wait(this.s.karma.filter((k) => k.sender === 'me').map((k) => {
        const p = this.person(k.recipient);
        return { id: k.id, kind: k.kind, occasion: k.occasion, message: k.message, gift: k.gift, recipient: k.recipient, recipient_name: p.display_name,
          recipient_color: p.color, anonymous: k.anonymous, reveal_status: k.reveal_status, thanked: k.thanked, deliver_at: k.deliver_at, scheduled: new Date(k.deliver_at) > new Date() };
      }).sort((a, b) => b.deliver_at.localeCompare(a.deliver_at)));
    }
    cancelKarma(id) { this.s.karma = this.s.karma.filter((k) => !(k.id === id && k.sender === 'me' && new Date(k.deliver_at) > new Date())); this.save(); return this.wait(); }
    thankKarma(id) { const k = this.s.karma.find((x) => x.id === id && x.recipient === 'me'); if (k) { k.thanked = true; this.save(); } return this.wait(); }
    requestKarmaReveal(id) {
      const k = this.s.karma.find((x) => x.id === id && x.recipient === 'me'); if (!k || k.reveal_status) return this.wait();
      k.reveal_status = 'open'; this.save();
      this.later(6000, () => { k.reveal_status = 'accepted'; k.revealed = true; });
      return this.wait();
    }
    respondKarmaReveal(id, yes) { const k = this.s.karma.find((x) => x.id === id && x.sender === 'me'); if (k) { k.reveal_status = yes ? 'accepted' : 'declined'; k.revealed = yes; this.save(); } return this.wait(); }

    // group cards
    card(id) { return this.s.cards.find((c) => c.id === id); }
    createGroupCard(c) {
      this.modCheck(c.title); this.modCheck(c.message);
      const id = uid();
      this.s.cards.push({ id, creator: 'me', recipient: c.recipient, title: c.title, closes_at: new Date(c.closesAt).toISOString(), delivered: false, created_at: now(),
        members: [{ user_id: 'me', message: c.message || null, joined_at: now() }, ...(c.invitees || []).filter((u) => u !== c.recipient).map((u) => ({ user_id: u, message: null, joined_at: null }))] });
      this.save();
      this.later(8000, () => { const x = this.card(id); const m = x && x.members.find((y) => !y.joined_at); if (m) { m.joined_at = now(); m.message = 'אני בפנים! איזה רעיון'; } });
      return this.wait(id);
    }
    joinGroupCard(id, msg) { this.modCheck(msg); const c = this.card(id); const m = c && c.members.find((x) => x.user_id === 'me'); if (m) { m.message = msg || null; m.joined_at = now(); this.save(); } return this.wait(); }
    deliverGroupCard(id) { const c = this.card(id); if (c && c.creator === 'me') { c.delivered = true; this.save(); } return this.wait(); }
    myGroupCards() {
      return this.wait(this.s.cards.filter((c) => c.members.some((m) => m.user_id === 'me')).map((c) => {
        const r = this.person(c.recipient); const me = c.members.find((m) => m.user_id === 'me');
        return { id: c.id, title: c.title, recipient: c.recipient, recipient_name: r.display_name, recipient_color: r.color, i_created: c.creator === 'me',
          closes_at: c.closes_at, delivered: c.delivered || new Date(c.closes_at) <= new Date(), joined: !!me.joined_at, members: c.members.length, joined_count: c.members.filter((m) => m.joined_at).length };
      }));
    }
    groupCardsForMe() { return this.wait([]); }
    groupCardMessages(id) {
      const c = this.card(id); if (!c) return this.wait([]);
      return this.wait(c.members.map((m) => { const p = this.person(m.user_id); return { user_id: m.user_id, name: p.display_name, color: p.color, message: m.message, joined: !!m.joined_at }; }));
    }
  }

  window.KarmaApi = (cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) ? new SupabaseApi() : new DemoApi();
})();
