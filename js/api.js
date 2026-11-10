// KARMA. prototype — demo data layer.
// Everything lives in this phone's localStorage. Friends "answer" after a few seconds,
// payments are simulated, businesses are samples. The server version comes later.
(function () {
  const KEY = 'karma_proto_v2';
  const H = 36e5, D = 864e5;
  const ago = (ms) => new Date(Date.now() - ms).toISOString();
  const ahead = (ms) => new Date(Date.now() + ms).toISOString();
  const uid = (p) => p + Math.random().toString(36).slice(2, 8);
  const code = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 31)]).join('');
  const mmdd = (days) => { const d = new Date(Date.now() + days * D); return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  // Launch scope: bets come later; one free gesture.
  const BETS = false;
  const GESTURES = {
    apology: { id: 'apology', emoji: '🙏', name: 'סליחה', desc: 'בלי מתנה. צריך אישור' },
  };
  const PRESETS = ['אכלת לי את הצ׳יפס', 'איחרת. שוב.', 'השארת אותי על וי כחול', 'לקחת בגד ולא החזרת', 'ספוילרת לי סדרה', 'ביטלת ברגע האחרון', 'שכחת להחזיר כסף', 'לא אמרת לי מזל טוב'];
  const OCCASIONS = [
    { id: 'miss', emoji: '', name: 'סתם כי התגעגעתי' },
    { id: 'thanks', emoji: '', name: 'תודה' },
    { id: 'congrats', emoji: '', name: 'מזל טוב' },
    { id: 'luck', emoji: '', name: 'בהצלחה' },
    { id: 'bday', emoji: '', name: 'יום הולדת שמח' },
  ];
  // Sample causes for "donate in someone's name" (real nonprofits are signed up later).
  const CAUSES = [
    { id: 'food', emoji: '🍞', name: 'סל מזון למשפחות', org: 'עמותה לדוגמה' },
    { id: 'dogs', emoji: '🐶', name: 'אימוץ כלבים', org: 'עמותה לדוגמה' },
    { id: 'books', emoji: '📚', name: 'ספרים לילדים', org: 'עמותה לדוגמה' },
    { id: 'trees', emoji: '🌳', name: 'נטיעת עצים', org: 'עמותה לדוגמה' },
    { id: 'kids', emoji: '🎈', name: 'יום כיף לילדים בבית חולים', org: 'עמותה לדוגמה' },
  ];
  const DONATION_AMOUNTS = [18, 36, 50, 100];
  const BET_CATS = [
    { id: 'sport', emoji: '⚽', name: 'ספורט' }, { id: 'tv', emoji: '📺', name: 'ריאליטי' },
    { id: 'life', emoji: '💍', name: 'חיים' }, { id: 'dare', emoji: '🔥', name: 'אתגר' }, { id: 'other', emoji: '🎲', name: 'אחר' },
  ];
  const BIZ_TYPES = {
    cafe: { name: 'בית קפה', emoji: '☕', suggest: [['☕', 'קפה', 'קפה בגודל רגיל, כל סוגי החלב', 16], ['🥐', 'קפה + מאפה', 'קפה ומאפה מהוויטרינה', 32], ['🍳', 'ארוחת בוקר', 'ארוחת בוקר זוגית', 98]] },
    icecream: { name: 'גלידרייה', emoji: '🍦', suggest: [['🍦', 'גלידה 2 כדורים', 'בגביע או בכוס', 24], ['🍨', 'גביע גדול', '3 כדורים + תוספת', 34]] },
    flowers: { name: 'חנות פרחים', emoji: '🌷', suggest: [['🌷', 'זר קטן', 'זר עונתי, איסוף מהחנות', 60], ['🌻', 'זר גדול', 'זר עונתי גדול, איסוף מהחנות', 120]] },
    bakery: { name: 'מאפייה', emoji: '🥐', suggest: [['🍪', '3 עוגיות', 'לבחירה מהמדף', 18], ['🎂', 'עוגה אישית', 'פרוסה או עוגונת', 28]] },
    bar: { name: 'בר', emoji: '🍺', suggest: [['🍺', 'בירה', 'חצי ליטר מהחבית', 32], ['🍸', 'קוקטייל', 'מהתפריט', 52]] },
  };

  function seed() {
    const friends = {
      'f-maya': { id: 'f-maya', name: 'מאיה', color: 'pink', p: 'f', birthday: mmdd(6), likes: { coffee: 'הפוך על שיבולת', sweet: 'גלידה פיסטוק', place: 'קפה לוטוס' }, since: ago(200 * D) },
      'f-itai': { id: 'f-itai', name: 'איתי', color: 'lime', p: 'm', birthday: mmdd(110), likes: { coffee: 'אספרסו כפול', sweet: 'עוגיות', place: '' }, since: ago(150 * D) },
      'f-noy': { id: 'f-noy', name: 'נוי', color: 'spicy', p: 'f', birthday: mmdd(18), likes: { coffee: '', sweet: 'גלידה', place: 'פרחי השוק' }, since: ago(90 * D) },
      'f-dani': { id: 'f-dani', name: 'דניאל', color: 'surface', p: 'm', birthday: mmdd(240), likes: {}, since: ago(60 * D) },
      'f-shira': { id: 'f-shira', name: 'שירה', color: 'lav', p: 'f', birthday: null, likes: {}, since: ago(20 * D) },
    };
    const businesses = {
      'biz-lotus': { id: 'biz-lotus', slug: 'lotus', name: 'קפה לוטוס', type: 'cafe', emoji: '☕', color: 'peach', address: 'שינקין 22, תל אביב', hours: 'א׳–ה׳ 7:00–20:00 · ו׳ 7:00–15:00', phone: '03-5550101', pin: '4827', paused: false, approved: true, joined: ago(40 * D),
        products: [{ id: 'p-coffee', emoji: '☕', name: 'קפה', includes: 'קפה בגודל רגיל, כל סוגי החלב', price: 16 }, { id: 'p-pastry', emoji: '🥐', name: 'קפה + מאפה', includes: 'קפה ומאפה מהוויטרינה', price: 32 }] },
      'biz-shalom': { id: 'biz-shalom', slug: 'shalom', name: 'גלידה של שלום', type: 'icecream', emoji: '🍦', color: 'pink', address: 'דיזנגוף 140, תל אביב', hours: 'כל יום 12:00–23:30', phone: '03-5550202', pin: '1903', paused: false, approved: true, joined: ago(30 * D),
        products: [{ id: 'p-ice', emoji: '🍦', name: 'גלידה 2 כדורים', includes: 'בגביע או בכוס', price: 24 }, { id: 'p-ice-big', emoji: '🍨', name: 'גביע גדול', includes: '3 כדורים + תוספת', price: 34 }] },
      'biz-flowers': { id: 'biz-flowers', slug: 'shuk-flowers', name: 'פרחי השוק', type: 'flowers', emoji: '🌷', color: 'lime', address: 'הכרמל 31, תל אביב', hours: 'א׳–ו׳ 8:00–17:00', phone: '03-5550303', pin: '5512', paused: false, approved: true, joined: ago(25 * D),
        products: [{ id: 'p-flowers', emoji: '🌷', name: 'זר קטן', includes: 'זר עונתי, איסוף מהחנות', price: 60 }, { id: 'p-flowers-big', emoji: '🌻', name: 'זר גדול', includes: 'זר עונתי גדול, איסוף מהחנות', price: 120 }] },
      'biz-alma': { id: 'biz-alma', slug: 'alma', name: 'מאפיית אלמה', type: 'bakery', emoji: '🥐', color: 'lav', address: 'לבונטין 8, תל אביב', hours: 'א׳–ו׳ 7:00–16:00', phone: '03-5550404', pin: '7730', paused: false, approved: true, joined: ago(12 * D),
        products: [{ id: 'p-cookies', emoji: '🍪', name: '3 עוגיות', includes: 'לבחירה מהמדף', price: 18 }] },
    };
    const gift = (id, from, to, pid, source, refId, purchased, expDays, status, redeemedAt) => ({ id, from, to, productId: pid, source, refId, code: code(), status, purchasedAt: purchased, expiresAt: new Date(new Date(purchased).getTime() + expDays * D).toISOString(), redeemedAt: redeemedAt || null });
    const gifts = {
      g1: gift('g1', 'f-itai', 'me', 'p-coffee', 'beef', 'b5', ago(3 * D), 30, 'active'),
      g2: gift('g2', 'f-maya', 'me', 'p-ice', 'karma', 'k1', ago(25 * D), 30, 'active'),
      g3: gift('g3', 'f-noy', 'me', 'p-flowers', 'karma', 'k3', ago(20 * D), 30, 'redeemed', ago(18 * D)),
      g4: gift('g4', 'me', 'f-maya', 'p-pastry', 'karma', 'k2', ago(2 * D), 30, 'active'),
      g5: gift('g5', 'f-dani', 'me', 'p-cookies', 'bet', 'bt9', ago(12 * D), 30, 'active'),
    };
    const beefs = {
      b1: { id: 'b1', from: 'f-maya', to: 'me', reason: 'אכלת לי את הצ׳יפס', spice: 2, status: 'open', createdAt: ago(2 * H) },
      b2: { id: 'b2', from: 'f-itai', to: 'me', reason: 'השארת אותי על וי כחול', spice: 1, status: 'open', createdAt: ago(5 * D) },
      b3: { id: 'b3', from: 'me', to: 'f-noy', reason: 'ספוילרת לי את הפרק האחרון', spice: 3, status: 'open', createdAt: ago(26 * H) },
      b4: { id: 'b4', from: 'me', to: 'f-maya', reason: 'ביטלת ברגע האחרון', spice: 1, status: 'pending', gesture: 'apology', gestureAt: ago(40 * 60e3), createdAt: ago(30 * H) },
      b5: { id: 'b5', from: 'me', to: 'f-itai', reason: 'לקחת לי את המטען ולא החזרת', spice: 2, status: 'settled', closedBy: 'gift', giftId: 'g1', createdAt: ago(3 * D + 40 * 60e3), closedAt: ago(3 * D) },
      b6: { id: 'b6', from: 'f-noy', to: 'me', reason: 'איחרת. שוב.', spice: 1, status: 'settled', closedBy: 'gesture', gesture: 'apology', createdAt: ago(15 * D), closedAt: ago(14 * D) },
      b7: { id: 'b7', from: 'f-dani', to: 'me', reason: 'שכחת להחזיר כסף', spice: 2, status: 'settled', closedBy: 'gesture', gesture: 'apology', createdAt: ago(9 * D), closedAt: ago(9 * D - 2 * H) },
      b8: { id: 'b8', from: 'me', to: 'f-shira', reason: 'לא אמרת לי מזל טוב', spice: 1, status: 'released', closedBy: 'release', createdAt: ago(12 * D), closedAt: ago(11 * D) },
    };
    const karma = {
      k1: { id: 'k1', from: 'f-maya', to: 'me', occasion: 'luck', message: 'שוברים את המבחן מחר', giftId: 'g2', createdAt: ago(25 * D), deliverAt: ago(25 * D), thanked: true },
      k2: { id: 'k2', from: 'me', to: 'f-maya', occasion: 'miss', message: 'סתם. כי את מאיה.', giftId: 'g4', createdAt: ago(2 * D), deliverAt: ago(2 * D), thanked: true },
      k3: { id: 'k3', from: 'f-noy', to: 'me', occasion: 'thanks', message: 'על ההסעה בשתיים בלילה', giftId: 'g3', createdAt: ago(20 * D), deliverAt: ago(20 * D), thanked: true },
      k4: { id: 'k4', from: 'f-shira', to: 'me', occasion: 'miss', message: 'ראיתי מם וחשבתי עלייך', giftId: null, createdAt: ago(4 * H), deliverAt: ago(4 * H), thanked: false },
      k5: { id: 'k5', from: 'me', to: 'f-itai', occasion: 'thanks', message: 'על המעבר דירה. גב של ברזל.', giftId: null, createdAt: ago(8 * D), deliverAt: ago(8 * D), thanked: false },
      k6: { id: 'k6', from: 'f-dani', to: 'me', occasion: 'congrats', message: 'על העבודה החדשה!!', giftId: null, donation: { cause: 'dogs', amount: 36 }, createdAt: ago(10 * D), deliverAt: ago(10 * D), thanked: true },
    };
    const bet = (o) => Object.assign({ claims: {}, giftId: null, remindedAt: null }, o);
    const bets = {
      bt1: bet({ id: 'bt1', from: 'f-itai', to: 'me', cat: 'sport', topic: 'מי לוקחת את הדרבי בשבת?', sideFrom: 'מכבי', sideTo: 'הפועל', stake: 'gift', productId: 'p-coffee', deadline: ahead(4 * D), status: 'pending', createdAt: ago(1 * H) }),
      bt2: bet({ id: 'bt2', from: 'me', to: 'f-maya', cat: 'life', topic: 'מי מתחתנת ראשונה מהחבורה?', sideFrom: 'נוי', sideTo: 'שירה', stake: 'honor', deadline: ahead(200 * D), status: 'active', createdAt: ago(6 * D) }),
      bt3: bet({ id: 'bt3', from: 'f-dani', to: 'me', cat: 'tv', topic: 'מי עפה השבוע מהאח הגדול?', sideFrom: 'רוני', sideTo: 'ליאת', stake: 'gift', productId: 'p-coffee', deadline: ago(1 * D), status: 'lost', winner: 'f-dani', claims: { me: 'f-dani', other: 'f-dani' }, createdAt: ago(5 * D), closedAt: ago(20 * H) }),
      bt4: bet({ id: 'bt4', from: 'me', to: 'f-noy', cat: 'dare', topic: 'נוי לא מחזיקה שבוע בלי סוכר', sideFrom: 'לא מחזיקה', sideTo: 'מחזיקה', stake: 'gift', productId: 'p-ice', deadline: ago(2 * D), status: 'done', winner: 'me', claims: { me: 'me', other: 'me' }, createdAt: ago(10 * D), closedAt: ago(2 * D) }),
      bt5: bet({ id: 'bt5', from: 'f-itai', to: 'me', cat: 'sport', topic: 'מכבי עולה לפיינל פור?', sideFrom: 'כן', sideTo: 'לא', stake: 'honor', deadline: ago(30 * D), status: 'done', winner: 'me', createdAt: ago(40 * D), closedAt: ago(30 * D) }),
      bt6: bet({ id: 'bt6', from: 'me', to: 'f-shira', cat: 'other', topic: 'כמה זמן ייקח לה להגיע', sideFrom: 'יותר מחצי שעה', sideTo: 'פחות', stake: 'honor', deadline: ago(16 * D), status: 'done', winner: 'me', createdAt: ago(17 * D), closedAt: ago(16 * D) }),
      bt9: bet({ id: 'bt9', from: 'f-dani', to: 'me', cat: 'dare', topic: 'דניאל רץ 10 ק״מ', sideFrom: 'רץ', sideTo: 'לא רץ', stake: 'gift', productId: 'p-cookies', deadline: ago(13 * D), status: 'done', winner: 'me', giftId: 'g5', createdAt: ago(20 * D), closedAt: ago(13 * D) }),
    };
    const n = (id, kind, title, body, link, at, read) => ({ id, kind, title, body, link, createdAt: at, read: !!read });
    const notifs = [
      n('n1', 'beef', "You've been KARMAd 😈", 'למאיה יש ביף איתך: אכלת לי את הצ׳יפס', 'beef/b1', ago(2 * H)),
      n('n3', 'karma', "You've been KARMAd 😇", 'שירה שלחה לך גוד קארמה', 'karma/k4', ago(4 * H)),
      n('n4', 'gesture', 'מאיה ביקשה סליחה', 'על "ביטלת ברגע האחרון". סגרנו?', 'mine/b4', ago(40 * 60e3)),
      n('n5', 'expiring', 'הגלידה מחכה לך', 'הגלידה של שלום תפוג בעוד 5 ימים', 'wallet', ago(26 * H), true),
      n('n7', 'closed', 'תיק סגור ✓', 'איתי סגר את החשבון בקפה', 'closed/b5', ago(3 * D), true),
    ];
    return {
      v: 5, signedIn: false, onboarded: false, invite: null, tipSeen: false, bdayAsked: false,
      me: { id: 'me', name: 'אור', email: 'or@gmail.com', color: 'pink', joined: ago(200 * D), pronoun: null, birthday: null, likes: {}, notif: { digest: '18:00', quiet: true } },
      friends, businesses, gifts: BETS ? gifts : (delete gifts.g5, gifts), beefs, karma, bets: BETS ? bets : {}, notifs, events: [], sales: synthSales(),
    };
  }
  // Fake sales history so the business dashboard has life in it.
  function synthSales() {
    const items = [['p-coffee', 16], ['p-pastry', 32]], out = [];
    for (let i = 0; i < 46; i++) {
      const [pid, price] = items[i % 3 === 0 ? 1 : 0];
      const back = (i * 13.7 % 28) * D + (i % 9) * H + 3 * H;
      const at = ago(back);
      out.push({ id: 's' + i, bizId: 'biz-lotus', productId: pid, price, at, redeemedAt: i < 34 ? ago(back - 2 * H) : null, newCustomer: i % 5 < 2 });
    }
    return out;
  }

  let S = null;
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const changed = () => { save(); window.dispatchEvent(new Event('karma:changed')); };
  const later = (ms, fn) => setTimeout(() => { if (S && S.signedIn) { fn(); changed(); } }, ms);
  const notify = (kind, title, body, link) => { S.notifs.unshift({ id: uid('n'), kind, title, body, link, createdAt: new Date().toISOString(), read: false }); };
  const who = (id) => (id === 'me' ? S.me : S.friends[id]);
  const fname = (id) => (who(id) || {}).name || '';
  const product = (pid) => { for (const b of Object.values(S.businesses)) { const p = b.products.find((x) => x.id === pid); if (p) return Object.assign({}, p, { biz: b }); } return null; };
  const other = (x) => (x.from === 'me' ? x.to : x.from);

  // Weak beefs (🌶) cool down by themselves after a week.
  function coolDown() {
    for (const b of Object.values(S.beefs)) {
      if (b.status === 'open' && b.spice === 1 && Date.now() - new Date(b.createdAt) > 7 * D) {
        b.status = 'cooled'; b.closedBy = 'cool'; b.closedAt = new Date().toISOString();
      }
    }
  }
  function makeGift(from, to, pid, source, refId) {
    const g = { id: uid('g'), from, to, productId: pid, source, refId, code: code(), status: 'active', purchasedAt: new Date().toISOString(), expiresAt: ahead(30 * D), redeemedAt: null };
    S.gifts[g.id] = g;
    const p = product(pid);
    S.sales.push({ id: uid('s'), bizId: p.biz.id, productId: pid, price: p.price, at: g.purchasedAt, redeemedAt: null, newCustomer: true });
    return g;
  }
  const decorateGift = (g) => g && Object.assign({}, g, { product: product(g.productId), fromP: who(g.from), toP: who(g.to) });
  const decorate = (b) => b && Object.assign({}, b, { fromP: who(b.from), toP: who(b.to), friend: who(other(b)), gift: b.giftId ? decorateGift(S.gifts[b.giftId]) : null });

  const api = {
    demo: true,
    GESTURES, PRESETS, OCCASIONS, BET_CATS, BIZ_TYPES, CAUSES, DONATION_AMOUNTS,
    async init() {
      try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; }
      if (!S || S.v !== 5) { S = seed(); save(); }
      save();
    },
    log(name, props) { if (!S) return; S.events.push({ name, props, at: Date.now() }); if (S.events.length > 300) S.events.splice(0, 100); save(); },
    signedIn: () => !!(S && S.signedIn),
    onboarded: () => !!S.onboarded,
    setOnboarded() { if (!S.onboarded) { S.onboarded = true; save(); } },
    tipSeen: () => S.tipSeen, setTipSeen() { S.tipSeen = true; save(); },
    bdayAsked: () => S.bdayAsked, setBdayAsked() { S.bdayAsked = true; save(); },
    BETS,
    canWrap: () => Date.now() - new Date(S.me.joined || 0) > 30 * D,
    // Demo: a brand-new user with nobody yet.
    async freshStart() {
      Object.assign(S, { friends: {}, beefs: {}, karma: {}, gifts: {}, bets: {}, notifs: [], invite: null, tipSeen: true });
      S.me.joined = new Date().toISOString(); changed();
    },
    async signIn() { S.signedIn = true; api.log('signup', {}); save(); },
    async signOut() { S.signedIn = false; S.onboarded = false; save(); },
    async reset() { localStorage.removeItem(KEY); S = seed(); save(); },
    async deleteAccount() { localStorage.removeItem(KEY); S = seed(); save(); },

    // ── invite (who brought me here) ──
    // kinds: 'beef' (an attached beef), 'karma' (attached good karma), 'plain' (just an invite)
    setInvite(kind) {
      if (!kind) { S.invite = null; save(); return; }
      S.invite = { from: 'f-maya', kind, approved: false };
      if (kind === 'beef' && !S.beefs.b0) S.beefs.b0 = { id: 'b0', from: 'f-maya', to: 'me', reason: 'לקחת לי את המטען ולא החזרת', spice: 2, status: 'open', createdAt: ago(10 * 60e3), hidden: true };
      if (kind === 'karma' && !S.karma.k0) S.karma.k0 = { id: 'k0', from: 'f-maya', to: 'me', occasion: 'miss', message: 'ברוכים הבאים ל-KARMA.', giftId: null, createdAt: ago(10 * 60e3), deliverAt: ago(10 * 60e3), thanked: false, hidden: true };
      save();
    },
    invite() { return S.invite && Object.assign({}, S.invite, { fromP: who(S.invite.from), beef: decorate(S.beefs.b0), karma: S.karma.k0 }); },
    async approveInvite() {
      if (!S.invite) return;
      S.invite.approved = true;
      if (S.beefs.b0) delete S.beefs.b0.hidden;
      if (S.karma.k0) delete S.karma.k0.hidden;
      changed();
    },
    clearInvite() { S.invite = null; save(); },

    // ── me & friends ──
    me: () => S.me,
    async updateMe(patch) { Object.assign(S.me, patch); changed(); return S.me; },
    friends: () => Object.values(S.friends).sort((a, b) => a.name.localeCompare(b.name, 'he')),
    friend: (id) => S.friends[id],
    async inviteFriend(name) {
      const id = uid('f-');
      S.friends[id] = { id, name, color: ['pink', 'lime', 'spicy', 'lav'][Math.floor(Math.random() * 4)], p: 'f', birthday: null, likes: {}, since: new Date().toISOString(), invited: true };
      changed(); return S.friends[id];
    },
    balanceWith(fid) {
      const all = [...Object.values(S.beefs), ...Object.values(S.karma)];
      const pair = (x) => (x.from === 'me' && x.to === fid) || (x.to === 'me' && x.from === fid);
      const beefs = Object.values(S.beefs).filter((b) => pair(b) && !b.hidden && b.status !== 'removed');
      const karma = Object.values(S.karma).filter((k) => pair(k) && !k.hidden && new Date(k.deliverAt) <= new Date());
      const bets = Object.values(S.bets).filter((b) => pair(b) && ['done', 'lost'].includes(b.status));
      return {
        good: karma.length, bad: beefs.length,
        mine: { good: karma.filter((k) => k.from === 'me').length, bad: beefs.filter((b) => b.from === 'me').length },
        theirs: { good: karma.filter((k) => k.from === fid).length, bad: beefs.filter((b) => b.from === fid).length },
        bets: { won: bets.filter((b) => b.winner === 'me').length, lost: bets.filter((b) => b.winner && b.winner !== 'me').length },
        history: [
          ...beefs.map((b) => ({ type: 'beef', at: b.createdAt, item: decorate(b) })),
          ...karma.map((k) => ({ type: 'karma', at: k.deliverAt, item: api.karmaItem(k.id) })),
          ...bets.map((b) => ({ type: 'bet', at: b.closedAt || b.createdAt, item: api.bet(b.id) })),
        ].sort((a, b) => new Date(b.at) - new Date(a.at)),
        _all: all.length,
      };
    },
    myTotals() {
      const k = Object.values(S.karma).filter((x) => !x.hidden && new Date(x.deliverAt) <= new Date());
      const b = Object.values(S.beefs).filter((x) => !x.hidden);
      const bt = Object.values(S.bets).filter((x) => ['done', 'lost'].includes(x.status));
      return { goodGot: k.filter((x) => x.to === 'me').length, goodSent: k.filter((x) => x.from === 'me').length, beefs: b.length, betsWon: bt.filter((x) => x.winner === 'me').length, betsLost: bt.filter((x) => x.winner !== 'me').length };
    },

    // ── businesses & products ──
    businesses: (all) => Object.values(S.businesses).filter((b) => all || (b.approved && !b.paused)),
    business: (idOrSlug) => S.businesses[idOrSlug] || Object.values(S.businesses).find((b) => b.slug === idOrSlug),
    product,
    // Three products that fit the moment; the friend's likes nudge the order.
    suggest({ spice, occasion, friendId }) {
      const all = api.businesses().flatMap((b) => b.products.map((p) => Object.assign({}, p, { biz: b })));
      const likes = (friendId && S.friends[friendId] && S.friends[friendId].likes) || {};
      const likeText = Object.values(likes).join(' ');
      const score = (p) => {
        let s = 0;
        if (likeText && (likeText.includes(p.biz.name) || (likeText.includes('גלידה') && p.biz.type === 'icecream') || (likeText.includes('קפה') || likes.coffee) && p.biz.type === 'cafe')) s += 3;
        if (spice === 1 && p.price <= 20) s += 2;
        if (spice === 2 && p.biz.type === 'cafe' && p.price < 30) s += 4;
        if (spice === 3 && p.id === 'p-pastry') s += 5;
        if (occasion === 'bday' && (p.biz.type === 'flowers' || p.biz.type === 'bakery')) s += 3;
        if (occasion === 'thanks' && p.biz.type === 'flowers') s += 2;
        if (occasion === 'miss' && p.biz.type === 'cafe') s += 2;
        if (occasion === 'luck' && p.biz.type === 'icecream') s += 2;
        return s - p.price / 200;
      };
      return all.sort((a, b) => score(b) - score(a));
    },
    likedBy(friendId, p) {
      const likes = (S.friends[friendId] || {}).likes || {};
      return Object.values(likes).some((v) => v && (v.includes(p.biz.name) || (p.biz.type === 'icecream' && v.includes('גלידה')) || (p.biz.type === 'cafe' && likes.coffee)));
    },

    // ── home ──
    home() {
      const now = Date.now();
      const beefs = Object.values(S.beefs).filter((b) => !b.hidden);
      const waiting = [];
      beefs.filter((b) => b.to === 'me' && b.status === 'open').forEach((b) => waiting.push({ type: 'beef', at: b.createdAt, urgency: 3 + b.spice, item: decorate(b) }));
      beefs.filter((b) => b.from === 'me' && b.status === 'pending').forEach((b) => waiting.push({ type: 'gesture', at: b.gestureAt, urgency: 6, item: decorate(b) }));
      beefs.filter((b) => b.to === 'me' && b.status === 'wantmore').forEach((b) => waiting.push({ type: 'wantmore', at: b.wantMoreAt, urgency: 7, item: decorate(b) }));
      Object.values(S.bets).filter((b) => b.to === 'me' && b.status === 'pending').forEach((b) => waiting.push({ type: 'challenge', at: b.createdAt, urgency: 5, item: api.bet(b.id) }));
      Object.values(S.bets).filter((b) => b.status === 'lost' && !b.giftId).forEach((b) => waiting.push({ type: 'owe', at: b.closedAt, urgency: 4, item: api.bet(b.id) }));
      Object.values(S.bets).filter((b) => b.status === 'active' && new Date(b.deadline) < now && !b.claims.me).forEach((b) => waiting.push({ type: 'claim', at: b.deadline, urgency: 5, item: api.bet(b.id) }));
      Object.values(S.karma).filter((k) => k.to === 'me' && !k.hidden && !k.seen && new Date(k.deliverAt) <= now && now - new Date(k.deliverAt) < 2 * D).forEach((k) => waiting.push({ type: 'karma', at: k.deliverAt, urgency: 8, item: api.karmaItem(k.id) }));
      waiting.sort((a, b) => b.urgency - a.urgency || new Date(b.at) - new Date(a.at));

      // one smart reminder
      let reminder = null;
      const soonBday = api.friends().map((f) => ({ f, d: K.daysToBirthday(f.birthday) })).filter((x) => x.d != null && x.d <= 7).sort((a, b) => a.d - b.d)[0];
      const expiring = api.wallet().active.find((g) => new Date(g.expiresAt) - now < 7 * D);
      if (soonBday) reminder = { type: 'bday', friend: soonBday.f, days: soonBday.d };
      else if (expiring) reminder = { type: 'expiring', gift: expiring };

      const week = now - 7 * D;
      const mine = beefs.filter((b) => b.from === 'me' && ['open', 'pending', 'wantmore'].includes(b.status)).map(decorate).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return {
        waiting, reminder, mine,
        week: {
          beefs: beefs.filter((b) => new Date(b.createdAt) > week).length,
          good: Object.values(S.karma).filter((k) => !k.hidden && new Date(k.deliverAt) > week && new Date(k.deliverAt) <= now).length,
          gifts: api.wallet().active.length,
        },
      };
    },

    // ── beefs ──
    beef: (id) => decorate(S.beefs[id]),
    beefs() {
      const all = Object.values(S.beefs).filter((b) => !b.hidden && b.status !== 'removed').map(decorate).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const open = (b) => ['open', 'pending', 'wantmore'].includes(b.status);
      return { onMe: all.filter((b) => b.to === 'me' && open(b)), mine: all.filter((b) => b.from === 'me' && open(b)), closed: all.filter((b) => !open(b)) };
    },
    async newBeef({ to, reason, spice }) {
      const cat = window.KarmaModeration && window.KarmaModeration.check(reason);
      if (cat) throw new Error('moderation:' + cat);
      const open = Object.values(S.beefs).filter((b) => ((b.from === 'me' && b.to === to) || (b.to === 'me' && b.from === to)) && ['open', 'pending', 'wantmore'].includes(b.status));
      if (open.length >= 3) throw new Error('too_many_open');
      const b = { id: uid('b'), from: 'me', to, reason, spice, status: 'open', createdAt: new Date().toISOString() };
      S.beefs[b.id] = b; api.log('beef_created', { spice }); changed();
      const f = S.friends[to];
      if (f && !f.invited) {
        // The friend answers after a bit: a light beef gets a gesture, a hot one gets coffee.
        later(7000, () => {
          const x = S.beefs[b.id]; if (!x || x.status !== 'open') return;
          if (spice === 3) {
            const g = makeGift(to, 'me', 'p-pastry', 'beef', b.id);
            Object.assign(x, { status: 'settled', closedBy: 'gift', giftId: g.id, closedAt: new Date().toISOString() });
            notify('closed', 'תיק סגור ✓', `${f.name} סגר${f.p === 'f' ? 'ה' : ''} את החשבון. מחכה לך משהו`, 'closed/' + b.id);
          } else {
            Object.assign(x, { status: 'pending', gesture: 'apology', gestureAt: new Date().toISOString() });
            notify('gesture', `${f.name} ${K.G(f.p, 'ביקשה', 'ביקש')} סליחה`, `על "${reason}". סגרנו?`, 'mine/' + b.id);
          }
        });
      }
      return decorate(b);
    },
    // Paying for a real gift closes the beef right away.
    async settleWithGift(id, pid) {
      const b = S.beefs[id];
      const g = makeGift('me', b.from, pid, 'beef', id);
      Object.assign(b, { status: 'settled', closedBy: 'gift', giftId: g.id, closedAt: new Date().toISOString() });
      api.log('beef_settled', { by: 'gift', pid }); changed();
      return decorate(b);
    },
    // A free gesture waits for the other side's OK.
    async offerGesture(id, gesture) {
      const b = S.beefs[id];
      Object.assign(b, { status: 'pending', gesture, gestureAt: new Date().toISOString() });
      api.log('gesture_offered', { gesture }); changed();
      const f = S.friends[b.from];
      later(6000, () => {
        const x = S.beefs[id]; if (x.status !== 'pending') return;
        if (x.spice === 3) {
          Object.assign(x, { status: 'wantmore', wantMoreAt: new Date().toISOString() });
          notify('wantmore', `${f.name} ${K.G(f.p, 'רוצה', 'רוצה')} יותר`, `סליחה לא מספיקה ל${f.name}. אולי קפה?`, 'beef/' + id);
        } else {
          Object.assign(x, { status: 'settled', closedBy: 'gesture', closedAt: new Date().toISOString() });
          notify('closed', 'סגרנו!', `${f.name} ${K.G(f.p, 'סלחה', 'סלח')}`, 'closed/' + id);
        }
      });
      return decorate(b);
    },
    async respondGesture(id, ok) {
      const b = S.beefs[id];
      if (ok) Object.assign(b, { status: 'settled', closedBy: 'gesture', closedAt: new Date().toISOString() });
      else {
        Object.assign(b, { status: 'wantmore', wantMoreAt: new Date().toISOString() });
        const f = S.friends[b.to];
        // The friend upgrades to coffee a moment later.
        later(6000, () => {
          const x = S.beefs[id]; if (x.status !== 'wantmore') return;
          const g = makeGift(b.to, 'me', 'p-coffee', 'beef', id);
          Object.assign(x, { status: 'settled', closedBy: 'gift', giftId: g.id, closedAt: new Date().toISOString() });
          notify('closed', 'תיק סגור ✓', `${f.name} ${K.G(f.p, 'שדרגה', 'שדרג')} לקפה`, 'closed/' + id);
        });
      }
      api.log('gesture_answer', { ok }); changed();
      return decorate(b);
    },
    async release(id) { Object.assign(S.beefs[id], { status: 'released', closedBy: 'release', closedAt: new Date().toISOString() }); changed(); },
    async report(id) { Object.assign(S.beefs[id], { status: 'removed', closedAt: new Date().toISOString() }); api.log('beef_reported', {}); changed(); },

    // ── good karma ──
    karmaItem(id) {
      const k = S.karma[id]; if (!k) return null;
      return Object.assign({}, k, { fromP: who(k.from), toP: who(k.to), friend: who(other(k)), occ: OCCASIONS.find((o) => o.id === k.occasion), cause: k.donation ? CAUSES.find((c) => c.id === k.donation.cause) : null, gift: k.giftId ? decorateGift(S.gifts[k.giftId]) : null });
    },
    karmaList() {
      const now = new Date();
      const all = Object.values(S.karma).filter((k) => !k.hidden).map((k) => api.karmaItem(k.id)).sort((a, b) => new Date(b.deliverAt) - new Date(a.deliverAt));
      return { got: all.filter((k) => k.to === 'me' && new Date(k.deliverAt) <= now), sent: all.filter((k) => k.from === 'me') };
    },
    seeKarma(id) { if (S.karma[id]) { S.karma[id].seen = true; save(); } },
    async sendKarma({ to, occasion, message, productId, onBirthday, donation }) {
      if (message) { const cat = window.KarmaModeration && window.KarmaModeration.check(message); if (cat) throw new Error('moderation:' + cat); }
      const deliverAt = onBirthday ? K.nextBirthdayMidnight(S.friends[to].birthday).toISOString() : new Date().toISOString();
      const k = { id: uid('k'), from: 'me', to, occasion, message: message || '', giftId: null, donation: donation || null, createdAt: new Date().toISOString(), deliverAt, thanked: false };
      if (productId) k.giftId = makeGift('me', to, productId, 'karma', k.id).id;
      S.karma[k.id] = k; api.log('karma_sent', { occasion, gift: !!productId, scheduled: !!onBirthday }); changed();
      const f = S.friends[to];
      if (!onBirthday && f && !f.invited) later(8000, () => { S.karma[k.id].thanked = true; notify('thanks', `${f.name} ${K.G(f.p, 'שלחה', 'שלח')} תודה`, 'על הגוד קארמה ששלחת', 'karma/' + k.id); });
      return api.karmaItem(k.id);
    },
    async thank(id) { S.karma[id].thanked = true; S.karma[id].thankedByMe = true; api.log('thanks_sent', {}); changed(); },

    // ── wallet & redeem ──
    wallet() {
      const mine = Object.values(S.gifts).filter((g) => g.to === 'me').map(decorateGift);
      const active = mine.filter((g) => g.status === 'active').sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt));
      return { active, used: mine.filter((g) => g.status !== 'active').sort((a, b) => new Date(b.redeemedAt || b.purchasedAt) - new Date(a.redeemedAt || a.purchasedAt)) };
    },
    gift: (id) => decorateGift(S.gifts[id]),
    async redeem(id, pin) {
      const g = S.gifts[id]; const p = product(g.productId);
      if (g.status !== 'active') throw new Error('redeemed');
      if (p.biz.paused) throw new Error('paused');
      if (pin !== p.biz.pin) throw new Error('bad_pin');
      Object.assign(g, { status: 'redeemed', redeemedAt: new Date().toISOString() });
      const sale = S.sales.slice().reverse().find((s) => s.productId === g.productId && !s.redeemedAt);
      if (sale) sale.redeemedAt = g.redeemedAt;
      api.log('gift_redeemed', { pid: g.productId }); changed();
      // Deliberately no notification to the sender. Redemption is private.
      return decorateGift(g);
    },

    // ── bets ──
    bet(id) {
      const b = S.bets[id]; if (!b) return null;
      return Object.assign({}, b, { fromP: who(b.from), toP: who(b.to), friend: who(other(b)), catP: BET_CATS.find((c) => c.id === b.cat), product: b.productId ? product(b.productId) : null, mySide: b.from === 'me' ? b.sideFrom : b.sideTo, theirSide: b.from === 'me' ? b.sideTo : b.sideFrom });
    },
    betsAll() {
      const all = Object.values(S.bets).map((b) => api.bet(b.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const done = all.filter((b) => ['done', 'lost', 'declined'].includes(b.status) && (b.status !== 'lost' || b.giftId));
      return {
        waiting: all.filter((b) => (b.status === 'pending' && b.to === 'me') || (b.status === 'lost' && !b.giftId) || (b.status === 'active' && new Date(b.deadline) < new Date() && !b.claims.me) || b.status === 'disputed'),
        open: all.filter((b) => (b.status === 'pending' && b.from === 'me') || (b.status === 'active' && !(new Date(b.deadline) < new Date() && !b.claims.me))),
        done,
        record: { won: all.filter((b) => b.winner === 'me').length, lost: all.filter((b) => b.winner && b.winner !== 'me').length },
      };
    },
    async newBet(o) {
      const cat = window.KarmaModeration && window.KarmaModeration.check(o.topic + ' ' + o.sideFrom + ' ' + o.sideTo);
      if (cat) throw new Error('moderation:' + cat);
      const b = Object.assign({ id: uid('bt'), from: 'me', status: 'pending', claims: {}, createdAt: new Date().toISOString() }, o);
      S.bets[b.id] = b; api.log('bet_created', { stake: o.stake }); changed();
      const f = S.friends[o.to];
      if (f && !f.invited) later(6000, () => { const x = S.bets[b.id]; if (x.status !== 'pending') return; x.status = 'active'; notify('bet', `${f.name} ${K.G(f.p, 'בפנים', 'בפנים')}`, o.topic, 'bet/' + b.id); });
      return api.bet(b.id);
    },
    async respondBet(id, yes) { S.bets[id].status = yes ? 'active' : 'declined'; api.log('bet_answer', { yes }); changed(); return api.bet(id); },
    // Both sides mark the winner. Same answer → done. Different → "let's talk".
    async claimBet(id, winner) {
      const b = S.bets[id]; b.claims.me = winner;
      const fid = other(b);
      // the friend agrees in the demo, unless they already disagreed
      // demo: the friend agrees (after a dispute they "talked about it" and re-mark the same)
      if (!b.claims.other || b.status === 'disputed') b.claims.other = winner;
      if (b.claims.other !== b.claims.me) b.status = 'disputed';
      else {
        b.winner = winner; b.closedAt = new Date().toISOString();
        b.status = b.stake === 'gift' && winner !== 'me' ? 'lost' : 'done';
        if (b.stake === 'gift' && winner === 'me') {
          // the friend lost: in the demo they pay a few seconds later, the gift lands in my wallet
          const f = S.friends[fid];
          later(7000, () => { if (S.bets[id].giftId) return; const g = makeGift(fid, 'me', b.productId, 'bet', id); S.bets[id].giftId = g.id; notify('gift', `${f.name} ${K.G(f.p, 'שילמה', 'שילם')} על ההפסד`, `${product(b.productId).emoji} מחכה לך ב"המתנות שלי"`, 'wallet'); });
        }
      }
      api.log('bet_claim', {}); changed(); return api.bet(id);
    },
    async disputeDemo(id) { const b = S.bets[id]; b.claims = { me: null, other: b.from === 'me' ? b.to : b.from }; b.status = 'disputed'; changed(); },
    async payBet(id) {
      const b = S.bets[id];
      const g = makeGift('me', other(b), b.productId, 'bet', id);
      b.giftId = g.id; b.status = 'done'; api.log('bet_paid', {}); changed(); return api.bet(id);
    },
    async remindLater(id) { S.bets[id].remindedAt = new Date().toISOString(); changed(); },

    // ── notifications ──
    notifications: () => S.notifs.slice(),
    unread: async () => S.notifs.filter((n) => !n.read).length,
    async markRead() { S.notifs.forEach((n) => { n.read = true; }); save(); },

    // ── Wrapped ──
    wrapped() {
      const t = api.myTotals();
      const best = api.friends().map((f) => ({ f, b: api.balanceWith(f.id) })).sort((a, b) => (b.b.good + b.b.bad) - (a.b.good + a.b.bad))[0];
      const closed = Object.values(S.beefs).filter((b) => b.closedAt && b.closedBy !== 'cool');
      const fastest = closed.map((b) => new Date(b.closedAt) - new Date(b.createdAt)).sort((a, b) => a - b)[0] || 0;
      const persona = t.goodSent >= t.beefs ? 'angel' : closed.length > 3 ? 'closer' : t.betsWon > 2 ? 'oracle' : 'beefmaster';
      return { closed: closed.length, fastest, goodSent: t.goodSent, goodGot: t.goodGot, won: t.betsWon, lost: t.betsLost, best: best && best.f, bestBal: best && best.b, persona };
    },

    // ── business side ──
    bizDashboard(bid) {
      const b = S.businesses[bid];
      const month = Date.now() - 30 * D;
      const sales = S.sales.filter((s) => s.bizId === bid);
      const thisMonth = sales.filter((s) => new Date(s.at) > month);
      const gross = thisMonth.reduce((a, s) => a + s.price, 0);
      const fee = b.freeMonth === false ? 0.1 : 0.1;
      return {
        biz: b,
        sold: thisMonth.length, redeemed: thisMonth.filter((s) => s.redeemedAt).length,
        newCustomers: thisMonth.filter((s) => s.newCustomer).length,
        gross, fee: Math.round(gross * fee), due: Math.round(gross * (1 - fee)),
        nextPayout: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString(); })(),
        waiting: sales.filter((s) => !s.redeemedAt).reduce((acc, s) => { acc[s.productId] = (acc[s.productId] || 0) + 1; return acc; }, {}),
        recent: sales.filter((s) => s.redeemedAt).sort((a, b) => new Date(b.redeemedAt) - new Date(a.redeemedAt)).slice(0, 6).map((s) => Object.assign({}, s, { product: product(s.productId) })),
      };
    },
    async updateBusiness(bid, patch) { Object.assign(S.businesses[bid], patch); changed(); return S.businesses[bid]; },
    async updateProduct(bid, pid, patch) {
      const b = S.businesses[bid];
      if (pid === 'new') { if (b.products.length >= 3) throw new Error('max3'); b.products.push(Object.assign({ id: uid('p-') }, patch)); }
      else if (patch === null) b.products = b.products.filter((p) => p.id !== pid);
      else Object.assign(b.products.find((p) => p.id === pid), patch);
      changed(); return b;
    },
    async addBusiness(data) {
      const id = uid('biz-');
      const slug = data.slug || id;
      S.businesses[id] = Object.assign({ id, slug, emoji: BIZ_TYPES[data.type].emoji, color: 'peach', pin: String(1000 + Math.floor(Math.random() * 9000)), paused: false, approved: false, joined: new Date().toISOString(), products: [] }, data, { id });
      changed(); return S.businesses[id];
    },
    async approveBusiness(bid) { S.businesses[bid].approved = true; changed(); },

    // ── QR checkout (from a sticker at the business) ──
    openBeefWith(fid) { return Object.values(S.beefs).filter((b) => b.to === 'me' && b.from === fid && ['open', 'wantmore'].includes(b.status)).map(decorate)[0] || null; },
    openBeefsOnMe() { return Object.values(S.beefs).filter((b) => b.to === 'me' && !b.hidden && ['open', 'wantmore'].includes(b.status)).map(decorate); },
  };
  window.K = window.K || {};
  K.api = api;
})();
