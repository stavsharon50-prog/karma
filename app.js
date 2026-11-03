// KARMA. — MVP app. Vanilla JS, hash routing, one render function per screen.
(function () {
  const api = window.KarmaApi;
  const $app = document.getElementById('app');
  const state = { me: null, friends: [], cache: {} };

  // ───────────────────────── helpers ─────────────────────────
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initial = (name) => esc((name || '?').trim().charAt(0));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  // Pick the right Hebrew form for a pronoun: f / m / pl
  const G = (p, f, m, pl) => (p === 'm' ? m : p === 'pl' ? (pl || m) : f);
  const me = (f, m, pl) => G(state.me && state.me.pronoun, f, m, pl);

  function timeAgo(iso) {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 60) return 'עכשיו';
    const m = Math.floor(s / 60); if (m < 60) return m === 1 ? 'לפני דקה' : `לפני ${m} דקות`;
    const h = Math.floor(m / 60); if (h < 24) return h === 1 ? 'לפני שעה' : h === 2 ? 'לפני שעתיים' : `לפני ${h} שעות`;
    const d = Math.floor(h / 24); if (d === 1) return 'אתמול'; if (d === 2) return 'לפני יומיים';
    if (d < 7) return `לפני ${d} ימים`;
    const w = Math.floor(d / 7); return w === 1 ? 'לפני שבוע' : `לפני ${w} שבועות`;
  }

  const KINDS = {
    beef: { label: 'טינה', tag: 'peach' },
    debt: { label: 'חוב', tag: 'lime' },
    promise: { label: 'הבטחה', tag: 'pink' },
    oops: { label: 'פדיחה', tag: '' },
  };
  const SPICE = { 1: 'מעקצץ', 2: 'חריף', 3: 'אש' };
  const STATUS = {
    pending: { en: 'Pending', he: 'ממתין' },
    in_progress: { en: 'In Progress', he: 'בטיפול' },
    settled: { en: 'Settled', he: 'נסגר' },
    forgiven: { en: 'Forgiven', he: 'נסלח' },
    released: { en: 'Released', he: 'שוחרר' },
  };
  const OFFERS = {
    coffee: { em: '☕', t: 'קפה עליי', s: 'הכי קלאסי. עובד תמיד' },
    apology: { em: '🎭', t: 'התנצלות דרמטית', s: 'הודעה קולית, עם רגש' },
    story: { em: '📸', t: 'סטורי פרגון', s: 'פומבי. מול כולם' },
    song: { em: '🎤', t: 'שיר בהודעה קולית', s: 'זיופים מתקבלים בברכה' },
    next_time: { em: '🍕', t: 'בפעם הבאה עליי', s: 'הבטחה. נרשמה' },
    custom: { em: '✍️', t: 'משהו אחר', s: 'אני אכתוב' },
  };
  // Preset reasons per kind, in [female, male, plural] forms of the target.
  const REASONS = {
    beef: [
      ['אכלה לי את הצ׳יפס', 'אכל לי את הצ׳יפס', 'אכלו לי את הצ׳יפס'],
      ['השאירה אותי על נקרא', 'השאיר אותי על נקרא', 'השאירו אותי על נקרא'],
      ['ראתה סטורי ולא עשתה לייק', 'ראה סטורי ולא עשה לייק', 'ראו סטורי ולא עשו לייק'],
      ['איחרה ב-40 דקות', 'איחר ב-40 דקות', 'איחרו ב-40 דקות'],
      ['ביטלה ברגע האחרון', 'ביטל ברגע האחרון', 'ביטלו ברגע האחרון'],
      ['עשתה לי ספוילר', 'עשה לי ספוילר', 'עשו לי ספוילר'],
      ['שלחה הודעה קולית של 4 דקות', 'שלח הודעה קולית של 4 דקות', 'שלחו הודעה קולית של 4 דקות'],
      ['לקחה את המטען שלי', 'לקח את המטען שלי', 'לקחו את המטען שלי'],
    ],
    debt: [
      ['חייבת לי קפה', 'חייב לי קפה', 'חייבים לי קפה'],
      ['חייבת לי טרמפ', 'חייב לי טרמפ', 'חייבים לי טרמפ'],
      ['לא החזירה את הסוודר', 'לא החזיר את הסוודר', 'לא החזירו את הסוודר'],
      ['חייבת לי ביס מהקינוח', 'חייב לי ביס מהקינוח', 'חייבים לי ביס מהקינוח'],
      ['שילמתי עליה בפעם האחרונה', 'שילמתי עליו בפעם האחרונה', 'שילמתי עליהם בפעם האחרונה'],
    ],
    promise: [
      ['אמרה שנקבע ונעלמה', 'אמר שנקבע ונעלם', 'אמרו שנקבע ונעלמו'],
      ['הבטיחה להחזיר את הספר', 'הבטיח להחזיר את הספר', 'הבטיחו להחזיר את הספר'],
      ['הבטיחה לבוא ליום הולדת', 'הבטיח לבוא ליום הולדת', 'הבטיחו לבוא ליום הולדת'],
      ['אמרה ״אני כבר בדרך״ מהמיטה', 'אמר ״אני כבר בדרך״ מהמיטה', 'אמרו ״אנחנו כבר בדרך״ מהמיטה'],
    ],
    oops: [
      ['שכחה את יום ההולדת שלי', 'שכח את יום ההולדת שלי', 'שכחו את יום ההולדת שלי'],
      ['קראה לי בשם של מישהו אחר', 'קרא לי בשם של מישהו אחר', 'קראו לי בשם של מישהו אחר'],
      ['ענתה ״חח״ על בדיחה מעולה', 'ענה ״חח״ על בדיחה מעולה', 'ענו ״חח״ על בדיחה מעולה'],
      ['סיימה את הסדרה בלעדיי', 'סיים את הסדרה בלעדיי', 'סיימו את הסדרה בלעדיי'],
    ],
  };

  const ICON = {
    close: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    back: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    plus: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B1116" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    user: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    friends: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.6-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3 2.6 3.5 5.2"/></svg>',
    google: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
    wa: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="#1B1116"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
  };
  const chili = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="#FF4A2B" stroke="#1B1116" stroke-width="1.8" stroke-linejoin="round"><path d="M3 15c7 4 15 0 17-9 0-1.5-1.6-2-2.4-.8C15.6 10 11 12.5 5 12.6c-2.4 0-3.6 1.6-2 2.4z"/><path d="M18.5 5.5c.3-1.6 1.3-2.8 3-3.3" fill="none"/></svg>';
  const chilis = (n) => `<span class="chilis">${chili.repeat(n)}</span>`;
  const av = (name, color, cls) => `<span class="av ${esc(color || 'surface')} ${cls || ''}">${initial(name)}</span>`;
  const statusPill = (st) => STATUS[st] ? `<span class="status ${st}">${STATUS[st].en}</span>` : '';
  const logo = (cls) => `<span class="logo ${cls || ''}">KARMA<i>.</i></span>`;

  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function errText(e) {
    const m = (e && e.message) || '';
    if (m.includes('too_many_open')) return 'כבר יש 3 חשבונות פתוחים עם החבר הזה. קודם לסגור משהו.';
    if (m.includes('not_friends')) return 'אפשר להוסיף רק חברים שאישרו אותך.';
    if (m.includes('blocked')) return 'אי אפשר לפתוח חשבון עם החבר הזה כרגע.';
    if (m.includes('closed')) return 'החשבון הזה כבר נסגר.';
    if (m.includes('invalid_invite')) return 'הלינק הזה כבר לא בתוקף.';
    if (m.includes('Failed to fetch') || m.includes('NetworkError')) return 'אין חיבור. בודקים את האינטרנט ומנסים שוב.';
    return 'משהו השתבש. מנסים שוב?';
  }

  // Bottom sheet confirm. Resolves true / false.
  function sheet(title, body, yes, no, danger) {
    return new Promise((resolve) => {
      const bg = document.createElement('div');
      bg.className = 'sheet-bg';
      bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <h2>${esc(title)}</h2><p class="muted" style="margin:0">${esc(body)}</p>
        <button class="btn ${danger ? '' : 'lime'}" data-y>${esc(yes)}</button>
        <button class="btn ghost" data-n>${esc(no || 'ביטול')}</button></div>`;
      const done = (v) => { bg.remove(); resolve(v); };
      bg.addEventListener('click', (e) => { if (e.target === bg) done(false); });
      bg.querySelector('[data-y]').onclick = () => done(true);
      bg.querySelector('[data-n]').onclick = () => done(false);
      document.body.appendChild(bg);
      bg.querySelector('[data-y]').focus();
    });
  }

  function go(path) { location.hash = '#/' + path; }
  function back(fallback) { if (history.length > 1 && state.navCount > 1) history.back(); else go(fallback || ''); }

  function render(html, opts) {
    opts = opts || {};
    document.body.classList.toggle('dark', !!opts.dark);
    const demo = api.demo ? '<div class="demo-bar">מצב הדגמה · החברים כאן מדומים והנתונים נשמרים רק בטלפון הזה</div>' : '';
    $app.innerHTML = demo + `<main class="screen">${html}</main>` + (opts.after || '');
    window.scrollTo(0, 0);
    const h = $app.querySelector('h1'); if (h) { h.setAttribute('tabindex', '-1'); }
    return $app;
  }
  const loading = () => render('<div class="loading"><div class="spin" aria-label="טוען"></div></div>');
  const on = (sel, ev, fn) => $app.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
  const header = (title, opts) => `<header class="top"><h1>${title}</h1>
    <button class="icon-btn" data-back aria-label="${opts && opts.close ? 'סגירה' : 'חזרה'}">${opts && opts.close ? ICON.close : ICON.back}</button></header>`;
  function wireBack(fallback) { on('[data-back]', 'click', () => back(fallback)); }

  async function loadFriends() { state.friends = await api.myFriends(); return state.friends; }
  const friendById = (id) => state.friends.find((f) => f.id === id);

  // ───────────────────────── screens ─────────────────────────

  // Welcome / sign in
  async function screenWelcome() {
    const token = store.get('karma_invite', null);
    let inviter = null;
    if (token) { try { inviter = await api.inviteInfo(token); } catch (e) {} }
    render(`
      <div style="margin-top:6vh" class="col">
        <div class="row" style="gap:8px"><span class="status pending">PENDING</span><span class="status settled">SETTLED</span></div>
        ${logo('xl')}
        <p class="display" style="font-size:26px;margin:4px 0 0;line-height:1.15">כל חשבון פתוח<br>נסגר בסוף. בכיף.</p>
      </div>
      ${inviter ? `<div class="card pink row">${av(inviter.display_name, inviter.color, 'lg')}
        <div><div class="h3">${esc(inviter.display_name)} ${G('f', 'הזמינה', 'הזמין')} אותך</div>
        <div class="small">מישהו פתח איתך חשבון. מה עשית?</div></div></div>` : `
      <div class="sticker" style="margin-top:10px">
        <div class="wrap"><span class="tag peach">טינה</span><span class="tag">חריף</span></div>
        <span class="display" style="font-size:20px">אכלה לי את הצ׳יפס</span>
        <span class="small muted">הדרך הכי מצחיקה לסגור חשבונות קטנים עם חברים</span>
      </div>`}
      <div class="stack-bottom">
        ${api.demo ? '<button class="btn" data-google>יאללה, נכנסים</button>' : `<button class="btn google" data-google>${ICON.google}<span>כניסה עם Google</span></button>`}
        <p class="micro muted center" style="margin:0">רק חברים שאישרו אותך יכולים להוסיף אותך לרשימה. תמיד.<br>הכניסה מגיל 18.</p>
      </div>`);
    on('[data-google]', 'click', async (e) => {
      e.currentTarget.disabled = true;
      api.log('signin_clicked', { invited: !!token });
      try { await api.signIn(); } catch (err) { toast(errText(err)); e.currentTarget.disabled = false; }
    });
  }

  // Onboarding / edit profile
  function screenOnboarding(editing) {
    const p = state.me || {};
    const f = { name: p.display_name || api.googleName() || '', pronoun: p.pronoun || 'f', color: p.color || 'pink', age: !!p.age_confirmed };
    const colors = [['pink', '#FF5FA8', 'ורוד'], ['lime', '#C8F135', 'ליים'], ['spicy', '#FF4A2B', 'צ׳ילי'], ['surface', '#FFFFFF', 'לבן']];
    render(`
      ${editing ? header('פרופיל') : `<div class="col" style="gap:6px">${logo()}<h1>נעים מאוד. רגע לפני שמתחילים</h1></div>`}
      <label class="field">איך קוראים לך?
        <input class="input" id="name" maxlength="30" autocomplete="given-name" value="${esc(f.name)}" placeholder="שם פרטי">
      </label>
      <div class="field">איך לפנות אלייך בהתראות?
        <div class="seg" role="group">
          ${[['f', 'את'], ['m', 'אתה'], ['pl', 'אתם']].map(([v, l]) => `<button type="button" data-pron="${v}" aria-pressed="${f.pronoun === v}">${l}</button>`).join('')}
        </div>
      </div>
      <div class="field">הצבע שלך
        <div class="colors">${colors.map(([v, hex, l]) => `<button type="button" data-color="${v}" aria-label="${l}" aria-pressed="${f.color === v}" style="background:${hex}"></button>`).join('')}</div>
      </div>
      ${editing ? '' : `<label class="check"><input type="checkbox" id="age" ${f.age ? 'checked' : ''}><span>אני בת או בן 18 ומעלה<span class="sub">KARMA. מיועדת לגילאי 18+</span></span></label>`}
      <div class="stack-bottom">
        <button class="btn" id="save">${editing ? 'לשמור' : 'יאללה, נכנסים'}</button>
        ${editing ? '' : '<p class="micro muted center" style="margin:0">בהמשך תוכלו לשנות הכל בפרופיל.</p>'}
      </div>`);
    if (editing) wireBack('profile');
    const $save = $app.querySelector('#save');
    const validate = () => {
      const ok = $app.querySelector('#name').value.trim().length > 0 && (editing || $app.querySelector('#age').checked);
      $save.disabled = !ok;
    };
    on('#name', 'input', validate); on('#age', 'change', validate); validate();
    on('[data-pron]', 'click', (e) => { f.pronoun = e.currentTarget.dataset.pron; $app.querySelectorAll('[data-pron]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.pron === f.pronoun)); });
    on('[data-color]', 'click', (e) => { f.color = e.currentTarget.dataset.color; $app.querySelectorAll('[data-color]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.color === f.color)); });
    $save.onclick = async () => {
      $save.disabled = true;
      try {
        state.me = await api.upsertProfile($app.querySelector('#name').value.trim(), f.pronoun, f.color, true);
        api.log(editing ? 'profile_updated' : 'signup_completed', { pronoun: f.pronoun });
        if (editing) { toast('נשמר'); go('profile'); return; }
        await afterSignup();
      } catch (e) { toast(errText(e)); $save.disabled = false; }
    };
  }

  async function afterSignup() {
    const token = store.get('karma_invite', null);
    if (token) {
      store.del('karma_invite');
      try {
        await api.acceptInvite(token);
        const inv = await api.inviteInfo(token).catch(() => null);
        api.log('invite_accepted');
        toast(inv ? `${me('את', 'אתה', 'אתם')} ו${inv.display_name} חברים עכשיו` : 'נוספה חברות חדשה');
      } catch (e) { toast(errText(e)); }
    }
    route();
  }

  // Home
  async function screenHome() {
    loading();
    const [count, onMe, mine] = await Promise.all([api.beefCount(), api.beefsForMe(), api.myBeefs(), loadFriends()]);
    // A beef about me that I haven't seen yet → the "You've been KARMAd" moment.
    const seen = store.get('karma_seen', []);
    const fresh = onMe.find((b) => b.status === 'pending' && !seen.includes(b.id));
    if (fresh && location.hash.replace('#/', '') === '') { go('karmad/' + fresh.id); return; }

    const openOnMe = onMe.filter((b) => ['pending', 'in_progress'].includes(b.status));
    const needsMe = mine.filter((b) => b.open_offer_from_target || b.reveal_status === 'open');
    const tab = state.homeTab || 'all';
    const filt = {
      all: (b) => !['released'].includes(b.status),
      pending: (b) => b.status === 'pending',
      in_progress: (b) => b.status === 'in_progress',
      closed: (b) => ['settled', 'forgiven'].includes(b.status),
    };
    const list = mine.filter(filt[tab]);
    const openMine = mine.filter((b) => ['pending', 'in_progress'].includes(b.status)).length;
    const isEmpty = count === 0 && mine.length === 0;

    const hero = count > 0 ? `
      <section class="card hero pink" aria-label="מי עדיין זוכר">
        <div class="ltr display" style="font-size:13px;font-weight:700;text-align:left">Who's got beef with me?</div>
        <div class="row" style="align-items:flex-end;gap:12px">
          <div class="counter">${count}${count >= 5 ? '+' : ''}</div>
          <div class="display" style="font-size:21px;font-weight:700;line-height:1.15;padding-bottom:4px">${count === 1 ? 'מישהו עדיין זוכר' : 'אנשים עדיין זוכרים'}<br>מה ${me('עשית', 'עשית', 'עשיתם')}</div>
        </div>
        <div class="row" style="gap:8px">${openOnMe.slice(0, 2).map((b) => `<div class="mini"><b>${KINDS[b.kind].label} · ${SPICE[b.spice]}</b>
          <span class="${b.creator_name ? '' : 'blur'}">${b.creator_name ? esc(b.creator_name) : 'מישהו מהחברים'}</span></div>`).join('')}</div>
        <div class="row" style="gap:8px">
          <a class="btn md dark" href="#/onme" style="flex:1">מה עשיתי?</a>
          <a class="btn md white" href="#/blind" style="flex:1">הסדר עיוור</a>
        </div>
      </section>` : `
      <section class="card hero" aria-label="מי עדיין זוכר">
        <div class="ltr display" style="font-size:13px;font-weight:700;text-align:left">Who's got beef with me?</div>
        <div class="row" style="align-items:flex-end;gap:12px"><div class="counter">0</div>
        <div class="display" style="font-size:21px;font-weight:700;line-height:1.15;padding-bottom:4px">אף אחד לא זוכר כלום.<br><span style="color:var(--chili)">חשוד.</span></div></div>
        ${onMe.length ? '<a class="btn md white" href="#/onme">לראות מה נסגר</a>' : ''}
      </section>`;

    const empty = `
      <div class="sec"><h2>מתחילים לנהל חשבונות</h2></div>
      <div class="col">
        <a class="step ${state.friends.length >= 3 ? 'done' : 'on'}" href="#/friends"><span class="n">1</span>
          <span style="flex:1"><b>להוסיף 3 חברים</b><br><span class="small">בלי חברים אין חשבונות</span></span><b>${Math.min(state.friends.length, 3)}/3</b></a>
        <a class="step ${state.friends.length >= 1 && state.friends.length < 3 ? '' : state.friends.length >= 3 ? 'on' : ''}" href="#/add"><span class="n">2</span>
          <span style="flex:1"><b>לפתוח טינה ראשונה</b><br><span class="small">משהו קטן. בשביל הספורט.</span></span></a>
        <div class="step"><span class="n">3</span><span style="flex:1"><b>לסגור חשבון ראשון</b><br><span class="small">קפה, התנצלות, או שיר מזויף</span></span></div>
      </div>`;

    const listHtml = `
      <div class="sec"><h2 class="ltr">My Petty List</h2><span class="small">${openMine} פתוחים</span></div>
      <div class="tabs" role="tablist">
        ${[['all', 'הכל'], ['pending', 'ממתינים'], ['in_progress', 'בטיפול'], ['closed', 'נסגרו']].map(([k, l]) => `<button class="tab" role="tab" data-tab="${k}" aria-selected="${tab === k}">${l}</button>`).join('')}
      </div>
      <div class="col">
        ${list.length ? list.map((b) => `
          <a class="beef ${['settled', 'forgiven'].includes(b.status) ? 'closed' : ''}" href="#/mine/${esc(b.id)}">
            ${av(b.target_name, b.target_color)}
            <span class="body"><span class="reason">${esc(b.reason)}</span>
              <span class="meta">${esc(b.target_name)} · ${timeAgo(b.created_at)} · ${SPICE[b.spice]}${b.anonymous ? ' · אנונימי' : ''}</span></span>
            ${b.open_offer_from_target || b.reveal_status === 'open' ? '<span class="status in_progress" style="direction:rtl">חדש!</span>' : statusPill(b.status)}
          </a>`).join('') : `<p class="muted small center">אין פה כלום. ${tab === 'all' ? 'עדיין.' : ''}</p>`}
      </div>`;

    render(`
      <header class="top">${logo()}
        <div class="row" style="gap:8px">
          <a class="icon-btn" href="#/friends" aria-label="חברים">${ICON.friends}</a>
          <a class="icon-btn" href="#/profile" aria-label="פרופיל">${ICON.user}</a>
        </div>
      </header>
      ${needsMe.length ? `<a class="card lime row" href="#/mine/${esc(needsMe[0].id)}" style="text-decoration:none">
        <span style="font-size:22px">🔔</span><span style="flex:1"><b>${esc(needsMe[0].target_name)} ${needsMe[0].open_offer_from_target ? 'מנסה לסגור איתך חשבון' : 'רוצה לדעת שזה ממך'}</b><br><span class="small">${esc(needsMe[0].reason)}</span></span>${ICON.back.replace('M9 6l6 6-6 6', 'M15 6l-6 6 6 6')}</a>` : ''}
      ${hero}
      ${isEmpty ? empty : listHtml}
      <a class="card lav row" href="#/gifts" style="text-decoration:none;margin-top:4px" data-gifts>
        <span style="font-size:24px">🎁</span><span style="flex:1"><b class="ltr">Karma Gifts</b> · <span class="tag pink">בקרוב</span><br><span class="small">לסגור חשבון עם קפה אמיתי מארומה</span></span></a>
      <div style="height:70px"></div>`, {
      after: `<a class="fab" href="#/add" aria-label="טינה חדשה">${ICON.plus}</a>`,
    });
    on('[data-tab]', 'click', (e) => { state.homeTab = e.currentTarget.dataset.tab; screenHome(); });
  }

  // You've been KARMAd
  async function screenKarmad(id) {
    const onMe = await api.beefsForMe();
    const b = onMe.find((x) => x.id === id);
    if (!b) return go('');
    const seen = store.get('karma_seen', []); if (!seen.includes(id)) { seen.push(id); store.set('karma_seen', seen.slice(-200)); }
    api.log('karmad_viewed', { kind: b.kind, spice: b.spice });
    const who = b.creator_name ? `${esc(b.creator_name)} ${G(friendById(b.creator) && friendById(b.creator).pronoun, 'הוסיפה', 'הוסיף', 'הוסיפו')} ${me('אותך', 'אותך', 'אתכם')}` : 'מישהו מהחברים';
    render(`
      <div class="card cream row" style="align-items:flex-start;border-radius:18px">
        <span class="av pink" style="border-radius:10px;width:36px;height:36px;font-size:15px">K.</span>
        <div><div class="micro"><b>KARMA. · ${timeAgo(b.created_at)}</b></div><div class="ltr" style="font-weight:700;text-align:right">You've been KARMAd!</div>
        <div class="small">מישהו עדיין לא ${me('סלח לך', 'סלח לך', 'סלח לכם')} על משהו…</div></div>
      </div>
      <div class="ltr" style="margin-top:14px;display:flex;flex-direction:column;align-items:flex-start;gap:4px">
        <span class="display" style="font-size:52px;line-height:.95">You've been</span>
        <span class="display" style="font-size:62px;line-height:.95;color:var(--pink)">KARMAd!</span>
      </div>
      <article class="sticker">
        <div class="wrap"><span class="tag ${KINDS[b.kind].tag}">${KINDS[b.kind].label}</span><span class="tag">${SPICE[b.spice]}</span><span class="tag">${timeAgo(b.created_at)}</span></div>
        <span class="display ${b.reason ? '' : 'blur'}" style="font-size:22px" ${b.reason ? '' : 'aria-label="הסיבה מוסתרת"'}>${b.reason ? esc(b.reason) : 'משהו שעשית השבוע'}</span>
        <span class="small ${b.creator_name ? '' : 'blur'}">${who}</span>
      </article>
      <div class="stack-bottom">
        <a class="btn" href="#/offer/${esc(b.id)}"><span class="ltr">Settle the beef</span></a>
        <a class="btn md white" href="#/onme">לכל מה שפתוח עליי</a>
        <a class="btn ghost" href="#/report/${esc(b.id)}">זה לא מצחיק אותי</a>
      </div>`, { dark: true });
  }

  // Beefs about me
  async function screenOnMe() {
    loading();
    const [onMe] = await Promise.all([api.beefsForMe(), loadFriends()]);
    const open = onMe.filter((b) => ['pending', 'in_progress'].includes(b.status));
    const closed = onMe.filter((b) => !['pending', 'in_progress'].includes(b.status));
    const card = (b) => {
      const isOpen = ['pending', 'in_progress'].includes(b.status);
      return `<article class="card col" style="gap:8px">
        <div class="row between"><div class="wrap"><span class="tag ${KINDS[b.kind].tag}">${KINDS[b.kind].label}</span><span class="tag">${SPICE[b.spice]}</span></div>${statusPill(b.status)}</div>
        <div class="display ${b.reason ? '' : 'blur'}" style="font-size:19px">${b.reason ? esc(b.reason) : 'משהו שעשית לא מזמן'}</div>
        <div class="small muted">${b.creator_name ? esc(b.creator_name) : '<span class="blur">מישהו</span>'} · ${timeAgo(b.created_at)}${b.is_match && b.creator_name ? ' · <b style="color:var(--chili)">Beef Match! גם לך יש משהו עליו</b>' : ''}</div>
        ${isOpen ? `<div class="row" style="gap:8px">
          <a class="btn md" href="#/offer/${esc(b.id)}" style="flex:1">${b.status === 'in_progress' ? 'עוד הצעה' : 'לסגור חשבון'}</a>
          ${b.creator_name ? '' : b.reveal_status === 'open' ? '<span class="small muted" style="flex:1;text-align:center">ביקשת לדעת מי. מחכים</span>' : b.reveal_status === 'declined' ? '<span class="small muted" style="flex:1;text-align:center">מעדיפים להישאר בצל</span>' : `<button class="btn md white" data-reveal="${esc(b.id)}" style="flex:1">לבקש לגלות מי</button>`}
        </div>
        ${b.status === 'in_progress' ? `<span class="micro muted">ההצעה שלך נשלחה. מחכים לתשובה.</span>` : ''}
        <a class="micro muted" href="#/report/${esc(b.id)}" style="align-self:flex-start">זה לא מצחיק אותי</a>` : ''}
      </article>`;
    };
    render(`
      ${header('מה עשיתי?')}
      <p class="muted" style="margin:-8px 0 0">${open.length ? `${open.length === 1 ? 'חשבון אחד פתוח' : open.length + ' חשבונות פתוחים'} ${me('עלייך', 'עליך', 'עליכם')}. אפשר לסגור כל אחד, גם בלי לדעת מי.` : 'אין חשבונות פתוחים. נקי.'}</p>
      ${open.length > 1 ? '<a class="btn lime" href="#/blind">הסדר עיוור לכולם</a>' : ''}
      <div class="col">${open.map(card).join('')}</div>
      ${closed.length ? `<h2>נסגרו</h2><div class="col">${closed.map(card).join('')}</div>` : ''}`);
    wireBack('');
    on('[data-reveal]', 'click', async (e) => {
      const id = e.currentTarget.dataset.reveal; e.currentTarget.disabled = true;
      try { await api.requestReveal(id); api.log('reveal_requested'); toast(`נשלח. אם ירצו, ${me('תדעי', 'תדע', 'תדעו')} מי`); screenOnMe(); } catch (err) { toast(errText(err)); }
    });
  }

  // Make an offer (target side), single beef or blind for all
  async function screenOffer(id, blind) {
    const onMe = await api.beefsForMe();
    const open = onMe.filter((b) => ['pending', 'in_progress'].includes(b.status));
    const targets = blind ? open : open.filter((b) => b.id === id);
    if (!targets.length) { toast(blind ? 'אין חשבונות פתוחים. נקי!' : 'החשבון הזה כבר נסגר'); return go(''); }
    const b = targets[0];
    let pick = null;
    render(`
      ${header(blind ? 'הסדר עיוור' : 'לסגור חשבון', { close: true })}
      <p class="muted" style="margin:-8px 0 0">${blind ? `לא ${me('יודעת', 'יודע', 'יודעים')} מי? אפשר לסגור בכל זאת. ההצעה תגיע לכל מי שזוכר, בלי לגלות לך מי זה.` : 'מה מציעים? אם יאשרו, החשבון נסגר.'}</p>
      ${blind ? `<div class="card cream flat row"><span class="display" style="font-size:34px">${targets.length}</span><span>חשבונות פתוחים יקבלו את ההצעה</span></div>` : `
      <div class="card row flat"><div class="wrap"><span class="tag ${KINDS[b.kind].tag}">${KINDS[b.kind].label}</span><span class="tag">${SPICE[b.spice]}</span></div>
        <span class="${b.reason ? '' : 'blur'}" style="flex:1;font-weight:700">${b.reason ? esc(b.reason) : 'משהו שעשית'}</span></div>`}
      <div class="col" role="group" aria-label="סוג ההצעה">
        ${Object.entries(OFFERS).map(([k, o]) => `<button class="opt" data-offer="${k}" aria-pressed="false"><span class="em" aria-hidden="true">${o.em}</span><span style="flex:1"><span class="t">${o.t}</span><br><span class="s">${o.s}</span></span></button>`).join('')}
      </div>
      <label class="field">הודעה ${blind ? 'למי שזה לא יהיה' : ''} (לא חובה)
        <textarea class="input" id="msg" maxlength="120" placeholder="למשל: סליחה. מעכשיו לייק על כל סטורי"></textarea>
      </label>
      <div class="col" style="gap:8px">
        <button class="btn" id="send" disabled>${blind ? 'לשלוח הסדר עיוור' : 'לשלוח הצעה'}</button>
        <p class="micro muted center" style="margin:0">רוצה לסגור עם מתנה אמיתית? <a href="#/gifts">Karma Gifts בקרוב</a></p>
      </div>`);
    wireBack(blind ? '' : 'onme');
    const $send = $app.querySelector('#send');
    const $msg = $app.querySelector('#msg');
    const validate = () => { $send.disabled = !pick || (pick === 'custom' && !$msg.value.trim()); };
    on('[data-offer]', 'click', (e) => {
      pick = e.currentTarget.dataset.offer;
      $app.querySelectorAll('[data-offer]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.offer === pick));
      $msg.placeholder = pick === 'custom' ? 'מה מציעים? (חובה)' : 'למשל: סליחה. מעכשיו לייק על כל סטורי';
      validate();
    });
    $msg.addEventListener('input', validate);
    $send.onclick = async () => {
      $send.disabled = true;
      try {
        for (const t of targets) await api.makeOffer(t.id, pick, $msg.value.trim());
        api.log(blind ? 'blind_settle_sent' : 'offer_sent', { type: pick, n: targets.length });
        toast(blind ? 'ההסדר העיוור נשלח' : 'ההצעה נשלחה. מחכים לתשובה');
        go('onme');
      } catch (e) { toast(errText(e)); $send.disabled = false; }
    };
  }

  // New beef
  async function screenAdd() {
    loading();
    await loadFriends();
    if (!state.friends.length) {
      render(`${header('טינה חדשה', { close: true })}
        <div class="card pink col" style="margin-top:10px"><h2>קודם צריך חברים</h2>
        <p style="margin:0">אפשר לפתוח חשבון רק עם חברים שאישרו אותך. שולחים להם הזמנה בוואטסאפ, וכשהם נכנסים אתם מחוברים.</p></div>
        <div class="stack-bottom"><a class="btn" href="#/friends">להזמין חברים</a></div>`);
      wireBack(''); return;
    }
    const f = { target: state.addTarget || null, kind: 'beef', reason: null, spice: 2, anonymous: true };
    state.addTarget = null;
    const draw = () => {
      const t = friendById(f.target);
      const pron = t ? t.pronoun : 'f';
      const reasons = REASONS[f.kind].map((r) => G(pron, r[0], r[1], r[2]));
      if (f.reason && !reasons.includes(f.reason)) f.reason = null;
      render(`
        ${header('טינה חדשה', { close: true })}
        <section class="col"><h3>1 · על מי?</h3>
          <div class="friends-row">${state.friends.map((x) => `<button class="friend-pick" data-target="${esc(x.id)}" aria-pressed="${f.target === x.id}">${av(x.display_name, x.color, 'lg')}<span>${esc(x.display_name)}</span></button>`).join('')}</div>
        </section>
        <section class="col"><h3>2 · מה זה?</h3>
          <div class="wrap">${Object.entries(KINDS).map(([k, v]) => `<button class="tab" role="tab" data-kind="${k}" aria-selected="${f.kind === k}">${v.label}</button>`).join('')}</div>
        </section>
        <section class="col"><h3>3 · מה קרה?</h3>
          <div class="wrap">${reasons.map((r) => `<button class="chip" data-reason="${esc(r)}" aria-pressed="${f.reason === r}">${esc(r)}</button>`).join('')}</div>
        </section>
        <section class="col"><h3>4 · כמה חריף?</h3>
          <div class="grid3">${[1, 2, 3].map((n) => `<button class="spice" data-spice="${n}" aria-pressed="${f.spice === n}">${chilis(n)}<span>${SPICE[n]}</span></button>`).join('')}</div>
        </section>
        <label class="check"><input type="checkbox" id="anon" ${f.anonymous ? 'checked' : ''}>
          <span style="flex:1">להישאר ${me('אנונימית', 'אנונימי', 'אנונימיים')}<span class="sub">${t ? `${esc(t.display_name)} ${G(pron, 'תדע', 'ידע', 'ידעו')}` : 'ידעו'} שזה ממך רק אם ${me('תסכימי', 'תסכים', 'תסכימו')} לחשוף</span></span></label>
        <button class="btn" id="send" ${f.target && f.reason ? '' : 'disabled'}>לשלוח לקארמה</button>`);
      wireBack('');
      on('[data-target]', 'click', (e) => { f.target = e.currentTarget.dataset.target; draw(); });
      on('[data-kind]', 'click', (e) => { f.kind = e.currentTarget.dataset.kind; f.reason = null; draw(); });
      on('[data-reason]', 'click', (e) => { f.reason = e.currentTarget.dataset.reason; draw(); });
      on('[data-spice]', 'click', (e) => { f.spice = Number(e.currentTarget.dataset.spice); draw(); });
      on('#anon', 'change', (e) => { f.anonymous = e.currentTarget.checked; draw(); });
      on('#send', 'click', async (e) => {
        e.currentTarget.disabled = true;
        try {
          const id = await api.createBeef(f);
          api.log('beef_created', { kind: f.kind, spice: f.spice, anonymous: f.anonymous });
          go('sent/' + id);
        } catch (err) { toast(errText(err)); e.currentTarget.disabled = false; }
      });
    };
    draw();
  }

  async function screenSent(id) {
    const [mine] = await Promise.all([api.myBeefs(), loadFriends()]);
    const b = mine.find((x) => x.id === id);
    if (!b) return go('');
    const t = friendById(b.target) || {};
    render(`
      <div style="margin-top:8vh" class="col">
        <h1 style="font-size:40px">נשלח לקארמה.</h1>
        <p style="margin:0;font-size:17px">עכשיו רק לחכות. ${esc(b.target_name)} ${G(t.pronoun, 'תדע', 'ידע', 'ידעו')} שמישהו זוכר.</p>
      </div>
      <article class="sticker" style="margin-top:10px">
        <div class="row between"><div class="wrap"><span class="tag ${KINDS[b.kind].tag}">${KINDS[b.kind].label}</span></div>${statusPill('pending')}</div>
        <span class="display" style="font-size:22px">${esc(b.reason)}</span>
        <span class="small muted">${esc(b.target_name)} · ${SPICE[b.spice]}${b.anonymous ? ` · ${me('את אנונימית', 'אתה אנונימי', 'אתם אנונימיים')}` : ''}</span>
      </article>
      <div class="stack-bottom">
        <a class="btn" href="#/">חזרה לבית</a>
        <a class="btn md white" href="#/add">יש לי עוד אחת</a>
      </div>`);
  }

  // My beef detail (creator side): accept / decline offers, forgive, release, answer reveal
  async function screenMine(id) {
    loading();
    const [mine, offers] = await Promise.all([api.myBeefs(), api.offersForBeef(id), loadFriends()]);
    const b = mine.find((x) => x.id === id);
    if (!b) return go('');
    const t = friendById(b.target) || {};
    const isOpen = ['pending', 'in_progress'].includes(b.status);
    const openOffers = offers.filter((o) => !o.mine && o.status === 'open');
    const accepted = offers.find((o) => o.status === 'accepted');
    const sheShe = (f, m, pl) => G(t.pronoun, f, m, pl);
    render(`
      ${header('סגירת חשבון')}
      <article class="card col" style="gap:8px">
        <div class="row">${av(b.target_name, b.target_color, 'lg')}
          <div style="flex:1;min-width:0"><div class="display" style="font-size:20px">${esc(b.reason)}</div>
          <div class="small muted">${esc(b.target_name)} · ${timeAgo(b.created_at)} · ${SPICE[b.spice]}${b.anonymous && !b.revealed ? ' · אנונימי' : ''}</div></div>
          ${statusPill(b.status)}</div>
      </article>
      ${b.reveal_status === 'open' ? `<div class="card lime col"><b>${esc(b.target_name)} ${sheShe('רוצה', 'רוצה', 'רוצים')} לדעת שזה ממך</b>
        <div class="row" style="gap:8px"><button class="btn md dark" data-rv="1" style="flex:1">לחשוף</button><button class="btn md white" data-rv="0" style="flex:1">להישאר בצל</button></div></div>` : ''}
      ${openOffers.map((o) => `<div class="card pink col">
        <span class="small"><b>${esc(b.target_name)} ${sheShe('הציעה', 'הציע', 'הציעו')}:</b></span>
        <div class="row"><span style="font-size:28px">${OFFERS[o.offer_type].em}</span><span class="display" style="font-size:22px;flex:1">${OFFERS[o.offer_type].t}</span></div>
        ${o.message ? `<div class="card flat" style="padding:10px 12px">״${esc(o.message)}״</div>` : ''}
        <div class="row" style="gap:8px"><button class="btn md lime" data-acc="${esc(o.id)}" style="flex:1">סגרנו!</button><button class="btn md white" data-dec="${esc(o.id)}" style="flex:1">לא מספיק</button></div>
      </div>`).join('')}
      ${isOpen && !openOffers.length ? `<div class="card cream flat center"><span class="small muted">${b.status === 'pending' ? `${esc(b.target_name)} עוד לא ${sheShe('הציעה', 'הציע', 'הציעו')} כלום. סבלנות.` : 'מחכים להצעה הבאה'}</span></div>` : ''}
      ${accepted && !isOpen ? `<div class="card lime col"><span class="small"><b>נסגר עם:</b></span><div class="display" style="font-size:22px">${OFFERS[accepted.offer_type].em} ${OFFERS[accepted.offer_type].t}</div>${accepted.message ? `<span>״${esc(accepted.message)}״</span>` : ''}</div>` : ''}
      ${b.status === 'forgiven' ? '<div class="card lav center"><b>סלחת. גדלות נפש.</b></div>' : ''}
      ${isOpen ? `<div class="stack-bottom">
        <a class="card lav row" href="#/gifts" style="text-decoration:none"><span style="font-size:22px">🎁</span><span style="flex:1"><b>או מתנה אמיתית</b> <span class="tag pink">בקרוב</span><br><span class="small">קפה ומאפה, גלידה, שובר</span></span></a>
        <button class="btn md white" data-close="forgiven">לסלוח בלי כלום</button>
        <button class="btn ghost" data-close="released">שחררתי (ייעלם בשקט)</button>
      </div>` : `<div class="stack-bottom"><a class="btn" href="#/">חזרה לבית</a></div>`}`);
    wireBack('');
    on('[data-acc]', 'click', async (e) => {
      e.currentTarget.disabled = true;
      try { await api.respondOffer(e.currentTarget.dataset.acc, true); api.log('offer_accepted'); go('settled/' + id); } catch (err) { toast(errText(err)); }
    });
    on('[data-dec]', 'click', async (e) => {
      e.currentTarget.disabled = true;
      try { await api.respondOffer(e.currentTarget.dataset.dec, false); api.log('offer_declined'); toast('נדחה. שיתאמצו יותר'); screenMine(id); } catch (err) { toast(errText(err)); }
    });
    on('[data-rv]', 'click', async (e) => {
      const yes = e.currentTarget.dataset.rv === '1';
      try { await api.respondReveal(id, yes); api.log('reveal_answered', { yes }); toast(yes ? 'נחשפת. אין דרך חזרה' : 'נשארת בצל'); screenMine(id); } catch (err) { toast(errText(err)); }
    });
    on('[data-close]', 'click', async (e) => {
      const how = e.currentTarget.dataset.close;
      const ok = await sheet(how === 'forgiven' ? 'לסלוח?' : 'לשחרר?',
        how === 'forgiven' ? `${b.target_name} ${sheShe('תראה', 'יראה', 'יראו')} שסלחת. החשבון נסגר.` : `החשבון ייעלם מהרשימה ויעבור לארכיון שרק ${me('את רואה', 'אתה רואה', 'אתם רואים')}. אפשר להחזיר משם.`,
        how === 'forgiven' ? 'סולחת וזהו' : 'שחררתי');
      if (!ok) return;
      try { await api.closeBeef(id, how); api.log('beef_closed', { how }); toast(how === 'forgiven' ? 'נסלח. קארמה טובה' : 'שוחרר. נשימה עמוקה'); go(''); } catch (err) { toast(errText(err)); }
    });
  }

  // Settled celebration (both sides)
  async function screenSettled(id) {
    const [mine, onMe, offers] = await Promise.all([api.myBeefs(), api.beefsForMe(), api.offersForBeef(id)]);
    const b = mine.find((x) => x.id === id) || onMe.find((x) => x.id === id);
    if (!b) return go('');
    const o = offers.find((x) => x.status === 'accepted');
    const other = b.target_name || b.creator_name || 'מישהו';
    render(`
      <div class="col" style="margin-top:4vh;gap:6px">
        <span class="status settled" style="align-self:flex-start;font-size:13px">SETTLED</span>
        <h1 style="font-size:46px">תיק סגור.</h1>
        <p style="margin:0">${esc(other)} ו${me('את', 'אתה', 'אתם')} סגרתם חשבון. בכיף.</p>
      </div>
      <article class="sticker" style="box-shadow:6px 6px 0 var(--lime)">
        <span class="display ${b.reason ? '' : 'blur'}" style="font-size:20px">${b.reason ? esc(b.reason) : 'משהו שקרה'}</span>
        ${o ? `<span class="tag lime" style="align-self:flex-start">${OFFERS[o.offer_type].em} ${OFFERS[o.offer_type].t}</span>${o.message ? `<span>״${esc(o.message)}״</span>` : ''}` : ''}
        <span class="micro muted">נסגר בהסכמה · ${timeAgo(b.closed_at || b.created_at)}</span>
      </article>
      <div class="stack-bottom">
        <button class="btn pink" data-share>לשתף</button>
        <a class="btn md white" href="#/">חזרה לבית</a>
      </div>`);
    on('[data-share]', 'click', async () => {
      api.log('settled_shared');
      const text = `סגרנו חשבון ב-KARMA. 🤝 ${o ? OFFERS[o.offer_type].t : ''}\n${inviteBase()}`;
      try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('הועתק'); } } catch (e) {}
    });
  }

  // Friends & invite
  function inviteBase() { return location.origin + location.pathname; }
  async function screenFriends() {
    loading();
    const [friends, token] = await Promise.all([loadFriends(), api.myInvite()]);
    const url = `${inviteBase()}?i=${encodeURIComponent(token)}`;
    const msg = `You've been KARMAd! 😈\nמישהו פתח איתך חשבון. מה עשית?\nנכנסים לראות › ${url}`;
    render(`
      ${header('חברים')}
      <p class="muted" style="margin:-8px 0 0">אפשר לפתוח חשבון רק עם חברים שנכנסו מהלינק שלך. ככה כולם בפנים מרצון.</p>
      <section class="card pink col">
        <h2>להזמין חברים</h2>
        <div class="wa-preview"><b class="ltr">You've been KARMAd! 😈</b><br>מישהו פתח איתך חשבון. מה עשית?<br><span style="color:#0B7A55">נכנסים לראות ›</span></div>
        <a class="btn md lime" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" data-wa>${ICON.wa} להזמין בוואטסאפ</a>
        <button class="btn md white" data-copy>להעתיק לינק</button>
      </section>
      <div class="sec"><h2>החברים שלי</h2><span class="small">${friends.length}</span></div>
      <div class="col">${friends.length ? friends.map((x) => `<div class="beef">${av(x.display_name, x.color)}<span class="body"><span class="reason">${esc(x.display_name)}</span></span>
        <button class="btn md" style="width:auto;min-height:38px;padding:0 12px;font-size:13px" data-beef="${esc(x.id)}">+ טינה</button></div>`).join('') : '<p class="muted small center">עוד אין. שולחים לינק לקבוצה ורואים מי נכנס ראשון.</p>'}</div>`);
    wireBack('');
    on('[data-wa]', 'click', () => api.log('invite_shared', { via: 'whatsapp' }));
    on('[data-copy]', 'click', async () => {
      api.log('invite_shared', { via: 'copy' });
      try { await navigator.clipboard.writeText(url); toast('הלינק הועתק'); } catch (e) { prompt('הלינק שלך:', url); }
    });
    on('[data-beef]', 'click', (e) => { state.addTarget = e.currentTarget.dataset.beef; go('add'); });
  }

  // "This isn't funny to me"
  async function screenReport(id) {
    let reason = null;
    render(`
      ${header('זה לא מצחיק אותי', { close: true })}
      <p style="margin:-6px 0 0">תודה ${me('שאמרת', 'שאמרת', 'שאמרתם')}. הבדיחה עובדת רק כשכולם צוחקים, ואת זה אנחנו מורידים עכשיו.</p>
      <div class="col" role="group" aria-label="סיבה">
        <h3>מה הכי מתאים? (לא חובה)</h3>
        ${[['hurts', 'זה פוגע בי'], ['sensitive', 'זה על משהו אישי או רגיש'], ['harassment', 'מרגיש לי שמתנכלים אליי'], ['not_now', 'סתם לא בא לי על זה']].map(([k, l]) => `<button class="opt" data-r="${k}" aria-pressed="false"><span class="t">${l}</span></button>`).join('')}
      </div>
      <div class="card cream flat small col" style="gap:4px">
        <span>· הטינה נמחקת מיד, אצלך ואצל מי שכתב אותה.</span>
        <span>· אנחנו בודקים דיווחים חוזרים על אותו אדם.</span>
      </div>
      <label class="check"><input type="checkbox" id="block"><span>לא לקבל יותר טינות מאותו אדם</span></label>
      <div class="stack-bottom">
        <button class="btn" id="go">להסיר את זה</button>
        <p class="micro muted center" style="margin:0">אם זה מרגיש כמו משהו גדול יותר מבדיחה, כדאי לדבר עם מישהו שסומכים עליו.<br>ער״ן, עזרה ראשונה נפשית: 1201</p>
      </div>`);
    wireBack('onme');
    on('[data-r]', 'click', (e) => { reason = e.currentTarget.dataset.r; $app.querySelectorAll('[data-r]').forEach((x) => x.setAttribute('aria-pressed', x.dataset.r === reason)); });
    on('#go', 'click', async (e) => {
      e.currentTarget.disabled = true;
      try {
        await api.reportBeef(id, reason, $app.querySelector('#block').checked);
        api.log('beef_reported', { reason, block: $app.querySelector('#block').checked });
        toast('הוסר. אנחנו כאן'); go('');
      } catch (err) { toast(errText(err)); e.currentTarget.disabled = false; }
    });
  }

  // Released archive
  async function screenArchive() {
    loading();
    const mine = await api.myBeefs();
    const rel = mine.filter((b) => b.status === 'released');
    render(`
      ${header('שחררתי')}
      <p class="muted" style="margin:-8px 0 0">רק ${me('את רואה', 'אתה רואה', 'אתם רואים')} את זה. נשימה עמוקה.</p>
      <div class="card lav row"><span class="counter" style="font-size:60px">${rel.length}</span><span class="display" style="font-size:18px">דברים ששחררת.<br>גדלות נפש.</span></div>
      <div class="col">${rel.map((b) => `<div class="beef closed">${av(b.target_name, b.target_color)}<span class="body"><span class="reason">${esc(b.reason)}</span><span class="meta">${esc(b.target_name)} · שוחרר ${timeAgo(b.closed_at)}</span></span>
        <button class="btn md white" style="width:auto;min-height:36px;padding:0 10px;font-size:12px" data-restore="${esc(b.id)}">להחזיר</button></div>`).join('') || '<p class="muted small center">עוד לא שחררת כלום.</p>'}</div>`);
    wireBack('profile');
    on('[data-restore]', 'click', async (e) => {
      try { await api.restoreBeef(e.currentTarget.dataset.restore); api.log('beef_restored'); toast('חזר לרשימה. הזיכרון חזק מכולנו'); screenArchive(); } catch (err) { toast(errText(err)); }
    });
  }

  // Profile & privacy
  function screenProfile() {
    const p = state.me;
    render(`
      ${header('פרופיל ופרטיות')}
      <div class="card row">${av(p.display_name, p.color, 'lg')}<div style="flex:1"><div class="h2">${esc(p.display_name)}</div><div class="small muted">${G(p.pronoun, 'את', 'אתה', 'אתם')}</div></div>
        <a class="btn md white" href="#/edit" style="width:auto;padding:0 14px">עריכה</a></div>
      <div class="col">
        <a class="opt" href="#/archive" style="text-decoration:none"><span class="em">🫧</span><span class="t" style="flex:1">ארכיון שחררתי</span></a>
        <a class="opt" href="#/friends" style="text-decoration:none"><span class="em">👯</span><span class="t" style="flex:1">חברים והזמנות</span></a>
      </div>
      <section class="card cream flat col small" style="gap:6px">
        <b>איך שומרים על זה כיף</b>
        <span>· רק חברים שנכנסו מהלינק שלך יכולים להוסיף אותך.</span>
        <span>· טינה אנונימית נחשפת רק אם שני הצדדים מסכימים.</span>
        <span>· ״זה לא מצחיק אותי״ מוחק טינה מיד.</span>
        <span>· אפשר לבחור רק מתוך סיבות מוכנות, בלי טקסט חופשי.</span>
      </section>
      <div class="stack-bottom">
        <button class="btn md white" data-reset>איפוס קארמה</button>
        <span class="micro muted center">מוחק אותך מכל הרשימות הפתוחות. בלחיצה אחת.</span>
        <button class="btn ghost" data-out>יציאה</button>
      </div>`);
    wireBack('');
    on('[data-reset]', 'click', async () => {
      const ok = await sheet('איפוס קארמה?', 'כל החשבונות הפתוחים, שלך ועלייך, יימחקו. אי אפשר לבטל.', 'לאפס הכל', 'לא עכשיו', true);
      if (!ok) return;
      try { await api.karmaReset(); api.log('karma_reset'); toast('דף חדש. קארמה נקייה'); go(''); } catch (e) { toast(errText(e)); }
    });
    on('[data-out]', 'click', async () => { await api.signOut(); state.me = null; store.del('karma_seen'); go(''); route(); });
  }

  // Gifts fake door — measures interest before building payments
  function screenGifts() {
    api.log('gifts_fake_door');
    const items = [['☕', 'קפה ומאפה', 'ארומה'], ['🍦', 'גלידה', 'אוטלו'], ['🥞', 'קרפ השלמה', 'ברטון'], ['🎁', 'שובר לבחירה', 'BuyMe']];
    render(`
      ${header('<span class="ltr">Karma Gifts</span>', { close: true })}
      <p style="margin:-8px 0 0">בקרוב אפשר יהיה לסגור חשבון עם מתנה אמיתית, שנשלחת רק כשסוגרים.</p>
      <div class="grid2">${items.map(([e, t, b]) => `<div class="card col" style="gap:4px;align-items:flex-start"><span style="font-size:30px">${e}</span><b>${t}</b><span class="small muted">${b}</span></div>`).join('')}</div>
      <div class="stack-bottom">
        <button class="btn pink" data-want>אני רוצה שזה יקרה</button>
        <span class="micro muted center">מתנה היא תמיד הצעה של מי שחייב. אף פעם לא דרישה.</span>
      </div>`);
    wireBack('');
    on('[data-want]', 'click', (e) => { api.log('gifts_interest'); e.currentTarget.disabled = true; e.currentTarget.textContent = 'רשמנו! נעדכן ראשונים'; });
  }

  // ───────────────────────── router ─────────────────────────
  state.navCount = 0;
  async function route() {
    state.navCount++;
    const path = location.hash.replace(/^#\/?/, '');
    const [name, arg] = path.split('/');
    try {
      if (!api.signedIn()) return screenWelcome();
      if (!state.me) state.me = await api.getProfile();
      if (!state.me) return screenOnboarding(false);
      api.log('screen_view', { screen: name || 'home' });
      switch (name) {
        case '': return screenHome();
        case 'karmad': return screenKarmad(arg);
        case 'onme': return screenOnMe();
        case 'offer': return screenOffer(arg, false);
        case 'blind': return screenOffer(null, true);
        case 'add': return screenAdd();
        case 'sent': return screenSent(arg);
        case 'mine': return screenMine(arg);
        case 'settled': return screenSettled(arg);
        case 'friends': return screenFriends();
        case 'report': return screenReport(arg);
        case 'archive': return screenArchive();
        case 'profile': return screenProfile();
        case 'edit': return screenOnboarding(true);
        case 'gifts': return screenGifts();
        default: return go('');
      }
    } catch (e) {
      console.error(e);
      render(`<div class="loading col center"><h2>אופס.</h2><p class="muted">${esc(errText(e))}</p><button class="btn md" onclick="location.reload()">לנסות שוב</button></div>`);
    }
  }

  // Refresh home when data changes (demo replies) or the app comes back to the foreground.
  const refreshable = () => ['', 'onme', 'mine'].includes(location.hash.replace(/^#\/?/, '').split('/')[0]);
  window.addEventListener('karma:changed', () => { if (refreshable() && !document.querySelector('.sheet-bg')) route(); toast('יש עדכון ב-KARMA.'); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && refreshable() && api.signedIn() && state.me) route(); });
  setInterval(() => { if (!document.hidden && !api.demo && refreshable() && api.signedIn() && state.me && !document.querySelector('.sheet-bg')) route(); }, 45000);
  window.addEventListener('hashchange', route);

  async function boot() {
    // Invite link: ?i=TOKEN → keep it until the person has signed up.
    const params = new URLSearchParams(location.search);
    if (params.get('i')) store.set('karma_invite', params.get('i'));
    loading();
    try { await api.init(); } catch (e) {
      render(`<div class="loading col center"><h2>אופס.</h2><p class="muted">לא הצלחנו להתחבר לשרת. בודקים את האינטרנט ומנסים שוב.</p><button class="btn md" onclick="location.reload()">לנסות שוב</button></div>`);
      return;
    }
    if (params.get('i') || params.get('code')) history.replaceState(null, '', location.pathname + location.hash);
    if (api.signedIn()) {
      try { state.me = await api.getProfile(); } catch (e) {}
      if (state.me && store.get('karma_invite', null)) return afterSignup();
    }
    route();
  }
  boot();

  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
