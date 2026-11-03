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

  // Friendly explanation when the text filter stops something.
  const MOD_MSG = {
    violence: 'זה נשמע כמו איום, גם אם בצחוק. ב-KARMA. סוגרים חשבון על צ׳יפס, לא במכות.',
    ostracism: 'זה נשמע כמו להוציא מישהו מהחבורה. פה סוגרים חשבונות, לא מחרימים.',
    hate: 'יש פה מילה שפוגעת במי שהאדם הוא. את זה לא שולחים.',
    sexual: 'בלי קללות ובלי מיניות. נסו לנסח את זה מצחיק יותר.',
    body: 'בלי הערות על איך מישהו נראה. זה אף פעם לא באמת מצחיק.',
  };
  const modCheck = (t) => (window.KarmaModeration ? window.KarmaModeration.check(t) : null);
  function modWarn($el, text) {
    const cat = modCheck(text);
    $el.hidden = !cat; $el.textContent = cat ? MOD_MSG[cat] : '';
    return cat;
  }

  function errText(e) {
    const m = (e && e.message) || '';
    const mod = m.match(/moderation:(\w+)/);
    if (mod) return MOD_MSG[mod[1]] || MOD_MSG.sexual;
    if (m.includes('chain_expired')) return 'עברו 24 שעות והשרשרת נסגרה. אפשר לשלוח קארמה רגילה.';
    if (m.includes('bad_date')) return 'התאריך לא תקין. בוחרים תאריך עתידי.';
    if (m.includes('empty')) return 'צריך לכתוב משהו.';
    if (m.includes('cooldown')) return 'החבר הזה קיבל הרבה טינות בזמן האחרון. נותנים לו לנשום כמה ימים.';
    if (m.includes('slow_down')) return 'הגעת למקסימום הטינות להיום. מחר עוד יום.';
    if (m.includes('paused')) return 'כמה טינות שלך דווחו לאחרונה, אז פתיחת טינות חדשות מושהית לכמה ימים.';
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
    ['pink', 'hotpink', 'lav'].forEach((t) => document.body.classList.toggle(t, opts.theme === t));
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
      const bad = modCheck($app.querySelector('#name').value);
      const ok = !bad && $app.querySelector('#name').value.trim().length > 0 && (editing || $app.querySelector('#age').checked);
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
    const [count, onMe, mine, bets, inbox] = await Promise.all([api.beefCount(), api.beefsForMe(), api.myBeefs(), api.myBets().catch(() => []), api.karmaInbox().catch(() => []), loadFriends()]);
    const kSeen = store.get('karma_k_seen', []);
    const freshK = inbox.find((k) => !kSeen.includes(k.id));
    if (freshK && location.hash.replace('#/', '') === '') { go('karma/' + freshK.id); return; }
    const betInvite = bets.find((b) => b.status === 'proposed' && b.awaiting_me);
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
      ${homeHeader()}
      ${navTabs('beefs')}
      ${betInvite ? `<a class="card lime row" href="#/bet/${esc(betInvite.id)}" style="text-decoration:none"><span class="display ltr" style="font-size:14px">VS</span><span style="flex:1"><b>${esc(betInvite.other_name)} ${G(betInvite.other_pronoun, 'זרקה', 'זרק', 'זרקו')} ${me('עלייך', 'עליך', 'עליכם')} כפפה</b><br><span class="small">${esc(betInvite.topic)}</span></span>${ICON.back.replace('M9 6l6 6-6 6', 'M15 6l-6 6 6 6')}</a>` : ''}
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
      <p class="card peach flat small" id="modwarn" role="alert" hidden style="margin:0"></p>
      <div class="col" style="gap:8px">
        <button class="btn" id="send" disabled>${blind ? 'לשלוח הסדר עיוור' : 'לשלוח הצעה'}</button>
        <p class="micro muted center" style="margin:0">רוצה לסגור עם מתנה אמיתית? <a href="#/gifts">Karma Gifts בקרוב</a></p>
      </div>`);
    wireBack(blind ? '' : 'onme');
    const $send = $app.querySelector('#send');
    const $msg = $app.querySelector('#msg');
    const $warn = $app.querySelector('#modwarn');
    const validate = () => { const bad = modWarn($warn, $msg.value); $send.disabled = !pick || (pick === 'custom' && !$msg.value.trim()) || !!bad; };
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
    const f = { target: state.addTarget || null, kind: 'beef', reason: null, custom: '', spice: 2, anonymous: true };
    const finalReason = () => (f.custom.trim() || f.reason || '');
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
          <div class="wrap">${reasons.map((r) => `<button class="chip" data-reason="${esc(r)}" aria-pressed="${!f.custom.trim() && f.reason === r}">${esc(r)}</button>`).join('')}</div>
          <label class="field" style="font-weight:500">משהו אחר? עד 60 תווים
            <input class="input" id="custom" maxlength="60" autocomplete="off" value="${esc(f.custom)}" placeholder="למשל: עשתה ספוילר לגמר" style="border-style:dashed">
          </label>
          <p class="card peach flat small" id="modwarn" role="alert" hidden style="margin:0"></p>
        </section>
        <section class="col"><h3>4 · כמה חריף?</h3>
          <div class="grid3">${[1, 2, 3].map((n) => `<button class="spice" data-spice="${n}" aria-pressed="${f.spice === n}">${chilis(n)}<span>${SPICE[n]}</span></button>`).join('')}</div>
        </section>
        <label class="check"><input type="checkbox" id="anon" ${f.anonymous ? 'checked' : ''}>
          <span style="flex:1">להישאר ${me('אנונימית', 'אנונימי', 'אנונימיים')}<span class="sub">${t ? `${esc(t.display_name)} ${G(pron, 'תדע', 'ידע', 'ידעו')}` : 'ידעו'} שזה ממך רק אם ${me('תסכימי', 'תסכים', 'תסכימו')} לחשוף</span></span></label>
        <button class="btn" id="send" disabled>לשלוח לקארמה</button>`);
      wireBack('');
      on('[data-target]', 'click', (e) => { f.target = e.currentTarget.dataset.target; draw(); });
      on('[data-kind]', 'click', (e) => { f.kind = e.currentTarget.dataset.kind; f.reason = null; draw(); });
      on('[data-reason]', 'click', (e) => { f.reason = e.currentTarget.dataset.reason; f.custom = ''; draw(); });
      const $send = $app.querySelector('#send');
      const $warn = $app.querySelector('#modwarn');
      const validate = () => {
        const bad = modWarn($warn, f.custom);
        $send.disabled = !f.target || finalReason().length < 2 || !!bad;
      };
      on('#custom', 'input', (e) => {
        f.custom = e.currentTarget.value;
        $app.querySelectorAll('[data-reason]').forEach((x) => x.setAttribute('aria-pressed', !f.custom.trim() && f.reason === x.dataset.reason));
        validate();
      });
      validate();
      on('[data-spice]', 'click', (e) => { f.spice = Number(e.currentTarget.dataset.spice); draw(); });
      on('#anon', 'change', (e) => { f.anonymous = e.currentTarget.checked; draw(); });
      on('#send', 'click', async (e) => {
        e.currentTarget.disabled = true;
        try {
          const id = await api.createBeef({ ...f, reason: finalReason() });
          api.log('beef_created', { kind: f.kind, spice: f.spice, anonymous: f.anonymous, custom: !!f.custom.trim() });
          go('sent/' + id);
        } catch (err) {
          if (/moderation/.test(err.message)) api.log('moderation_blocked', { where: 'beef', category: (err.message.match(/moderation:(\w+)/) || [])[1] });
          toast(errText(err)); e.currentTarget.disabled = false;
        }
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
      <div class="col">${friends.length ? friends.map((x) => `<div class="beef">${av(x.display_name, x.color)}<a class="body" href="#/friend/${esc(x.id)}" style="text-decoration:none;color:inherit"><span class="reason">${esc(x.display_name)}</span><span class="meta">המאזן ביניכם ›</span></a>
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
        <a class="opt" href="#/wishlist" style="text-decoration:none"><span class="em">💝</span><span class="t" style="flex:1">מה משמח אותי</span></a>
        <a class="opt" href="#/work" style="text-decoration:none"><span class="em">💼</span><span class="t" style="flex:1"><span class="ltr">KARMA. for Work</span> · שי לחג לעובדים</span></a>
      </div>
      <section class="card cream flat col small" style="gap:6px">
        <b>איך שומרים על זה כיף</b>
        <span>· רק חברים שנכנסו מהלינק שלך יכולים להוסיף אותך.</span>
        <span>· טינה אנונימית נחשפת רק אם שני הצדדים מסכימים.</span>
        <span>· ״זה לא מצחיק אותי״ מוחק טינה מיד.</span>
        <span>· כל טקסט עובר סינון: קללות, איומים, גזענות וחרם לא נשלחים.</span>
        <span>· אם הרבה אנשים פותחים טינה על אותו אדם בבת אחת, המערכת עוצרת את זה.</span>
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

  // ═════════════════════════ Phase 2: bets & good karma ═════════════════════════

  const STAKES = {
    coffee: 'קפה ומאפה', apology: 'התנצלות דרמטית', song: 'שיר בהודעה קולית', next_time: 'בפעם הבאה עליי', custom: 'משהו אחר',
  };
  const stakeLabel = (b) => (b.stake === 'custom' && b.stake_text ? b.stake_text : STAKES[b.stake] || '');
  const BET_CATS = { sport: 'ספורט', reality: 'ריאליטי', personal: 'אתגר אישי', free: 'חופשי' };
  const BET_TEMPLATES = {
    sport: ['מכבי לוקחת אליפות השנה', 'ישראל עולה למונדיאל', 'הפועל מנצחת בדרבי', 'מי לוקח את ה-NBA'],
    reality: ['מי מנצח באח הגדול', 'הזוג הזה ייפרד לפני הגמר', 'מי עוזב השבוע'],
    personal: ['חודש שלם בחדר כושר בלי לפספס', 'לא כותבים לאקס עד סוף החודש', 'מגיעים בזמן לארוחה הבאה', 'שבוע בלי סוכר'],
    free: [],
  };
  const OCCASIONS = ['סתם כי התגעגעתי', 'תודה שהיית שם', 'מזל טוב', 'בהצלחה', 'רפואה שלמה', 'יום הולדת שמח', 'גאה בך'];
  const COMPLIMENTS = [
    ['הכי מצחיקה בקבוצה', 'הכי מצחיק בקבוצה', 'הכי מצחיקים בקבוצה'],
    ['החברה הכי טובה שיש', 'החבר הכי טוב שיש', 'החברים הכי טובים שיש'],
    ['תמיד יודעת מה להגיד', 'תמיד יודע מה להגיד', 'תמיד יודעים מה להגיד'],
    ['יש לה את הצחוק הכי מדבק', 'יש לו את הצחוק הכי מדבק', 'יש להם את הצחוק הכי מדבק'],
    ['הכי שווה לדבר איתה בשתיים בלילה', 'הכי שווה לדבר איתו בשתיים בלילה', 'הכי שווה לדבר איתם בשתיים בלילה'],
  ];
  const GIFTS = {
    words: { t: 'רק מילים', s: 'בחינם' },
    coffee: { t: 'קפה ומאפה', s: 'ארומה · בקרוב' },
    voucher: { t: 'שובר לבחירה', s: 'BuyMe · בקרוב' },
  };
  const PLACES = ['ארומה', 'אוטלו', 'ברטון', 'קפה גרג', 'לנדוור', 'רולדין'];
  const TAGS = ['פרחים', 'ספרים', 'יין', 'סושי', 'ספא', 'צמחים', 'שוקולד', 'פיצה', 'הופעות'];
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const HEART = '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="#1B1116"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z"/></svg>';
  const CHECK = '<svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#1B1116" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>';

  const todayStr = (plus) => { const d = new Date(Date.now() + (plus || 0) * 864e5); return d.toISOString().slice(0, 10); };
  function daysLeft(dateStr) {
    const d = Math.round((new Date(dateStr + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 864e5);
    if (d < 0) return { t: 'נגמר. מי ניצח?', hot: true, past: true };
    if (d === 0) return { t: 'נגמר היום!', hot: true, past: true };
    if (d === 1) return { t: 'מחר נגמר!', hot: true };
    return { t: `עוד ${d} ימים`, hot: false };
  }
  const bdayText = (b) => { if (!b) return ''; const [m, d] = b.split('-').map(Number); return `${d} ב${MONTHS[m - 1]}`; };
  function nextBirthday(b) {
    if (!b) return null;
    const [m, d] = b.split('-').map(Number); const now = new Date();
    let t = new Date(now.getFullYear(), m - 1, d, 0, 0, 0);
    if (t <= now) t = new Date(now.getFullYear() + 1, m - 1, d, 0, 0, 0);
    return t;
  }
  function whenText(iso) {
    const d = new Date(iso); const days = Math.round((d - new Date()) / 864e5);
    const hm = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    if (days <= 0) return `היום ב-${hm}`; if (days === 1) return `מחר ב-${hm}`;
    return `${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} ב-${hm}`;
  }

  function navTabs(active) {
    const t = [['', 'חשבונות', 'beefs'], ['bets', 'התערבויות', 'bets'], ['good', 'קארמה טובה', 'good']];
    return `<nav class="tabs" aria-label="אזורים">${t.map(([h, l, k]) => `<a class="tab" href="#/${h}" ${active === k ? 'aria-current="page" aria-selected="true"' : 'aria-selected="false"'} style="display:inline-flex;align-items:center;text-decoration:none">${l}</a>`).join('')}</nav>`;
  }
  const homeHeader = () => `<header class="top">${logo()}
      <div class="row" style="gap:8px">
        <a class="icon-btn" href="#/friends" aria-label="חברים">${ICON.friends}</a>
        <a class="icon-btn" href="#/profile" aria-label="פרופיל">${ICON.user}</a>
      </div></header>`;
  const friendPicker = (sel, attr, list) => `<div class="friends-row">${(list || state.friends).map((x) => `<button class="friend-pick" ${attr}="${esc(x.id)}" aria-pressed="${sel === x.id || (Array.isArray(sel) && sel.includes(x.id))}">${av(x.display_name, x.color, 'lg')}<span>${esc(x.display_name)}</span></button>`).join('')}</div>`;
  const noFriends = (title) => {
    render(`${header(title, { close: true })}
      <div class="card pink col" style="margin-top:10px"><h2>קודם צריך חברים</h2>
      <p style="margin:0">שולחים לחברים הזמנה בוואטסאפ, וכשהם נכנסים אתם מחוברים.</p></div>
      <div class="stack-bottom"><a class="btn" href="#/friends">להזמין חברים</a></div>`);
    wireBack('');
  };

  // ───────────── Bets list ─────────────
  async function screenBets() {
    loading();
    const bets = await api.myBets();
    const resolved = bets.filter((b) => b.status === 'resolved');
    const wins = resolved.filter((b) => b.i_won).length; const losses = resolved.length - wins;
    const badge = !resolved.length ? 'עוד אין תוצאות' : wins > losses ? me('הנביאה של החבורה', 'הנביא של החבורה', 'הנביאים של החבורה') : wins === losses ? 'תיקו מכובד' : me('מפסידה בכבוד', 'מפסיד בכבוד', 'מפסידים בכבוד');
    const owedToMe = resolved.filter((b) => b.i_won && !b.paid).length;
    const needsMe = (b) => (b.status === 'proposed' && b.awaiting_me) || b.status === 'disputed' || (b.status === 'active' && daysLeft(b.resolve_on).past && !b.my_claim) || (b.status === 'resolved' && b.i_won && !b.paid);
    const groups = [
      ['מחכה לך', bets.filter(needsMe)],
      ['פתוחות', bets.filter((b) => !needsMe(b) && (b.status === 'active' || (b.status === 'proposed' && !b.awaiting_me)))],
      ['נסגרו', bets.filter((b) => !needsMe(b) && ['resolved', 'declined'].includes(b.status))],
    ];
    const card = (b) => {
      const dl = daysLeft(b.resolve_on);
      let tag = dl.t, hot = dl.hot && b.status === 'active';
      if (b.status === 'proposed') { tag = b.awaiting_me ? 'קיבלת אתגר!' : 'ממתין לאישור'; hot = b.awaiting_me; }
      if (b.status === 'disputed') { tag = 'לא מסכימים'; hot = true; }
      if (b.status === 'resolved') { tag = b.i_won ? (b.paid ? 'ניצחת · נגבה' : 'ניצחת! לגבות') : (b.paid ? 'הפסדת · שולם' : 'הפסדת'); hot = b.i_won && !b.paid; }
      if (b.status === 'declined') tag = 'לא נכנסו';
      return `<a href="#/bet/${esc(b.id)}" class="card col ${hot ? 'pink' : ''} ${b.status === 'declined' ? 'flat' : ''}" style="gap:8px;text-decoration:none;${hot ? '' : 'box-shadow:none'}">
        <div class="row between"><span class="tag ${hot ? '' : b.status === 'resolved' ? 'lime' : 'peach'}" ${hot ? 'style="background:var(--ink);color:var(--cream)"' : ''}>${esc(tag)}</span>
          <span class="micro"><b>מול ${esc(b.other_name)} · ${esc(stakeLabel(b))}</b></span></div>
        <span class="display" style="font-size:18px">${esc(b.topic)}</span>
        <span class="micro"><b>${me('את', 'אתה', 'אתם')}: ${esc(b.my_side)}</b> · ${esc(b.other_name)}: ${esc(b.their_side)}</span>
      </a>`;
    };
    render(`
      ${homeHeader()}
      ${navTabs('bets')}
      <section class="card hero lime row" style="gap:14px;align-items:center" aria-label="המאזן שלך">
        <div class="display ltr" style="display:flex;align-items:baseline;gap:6px"><span style="font-size:54px;line-height:.9">${wins}</span><span style="font-size:26px">–</span><span style="font-size:54px;line-height:.9">${losses}</span></div>
        <div class="col" style="gap:4px"><span class="display" style="font-size:18px">${badge}</span>
          <span class="small">${wins} ניצחונות, ${losses} הפסדים.${owedToMe ? ` ${owedToMe} חובות בדרך ${me('אלייך', 'אליך', 'אליכם')}.` : ''}</span></div>
      </section>
      ${bets.length ? groups.filter(([, l]) => l.length).map(([t, l]) => `<div class="sec"><h2>${t}</h2><span class="small">${l.length}</span></div><div class="col">${l.map(card).join('')}</div>`).join('') : `
        <div class="card col center" style="gap:10px"><h2>עוד אין התערבויות</h2><p class="muted" style="margin:0">על קפה, על התנצלות או על שיר מזויף. אף פעם לא על כסף.</p>
        <a class="btn md lime" href="#/bet-new">להתערב ראשונה</a></div>`}
      <div style="height:70px"></div>`, { after: `<a class="fab" href="#/bet-new" aria-label="התערבות חדשה" style="background:var(--lime)">${ICON.plus}</a>` });
  }

  // ───────────── New bet ─────────────
  async function screenBetNew() {
    loading();
    await loadFriends();
    if (!state.friends.length) return noFriends('התערבות חדשה');
    const f = { opponent: state.addTarget || null, category: 'sport', topic: '', mySide: 'כן', theirSide: 'לא', stake: 'coffee', stakeText: '', resolveOn: todayStr(7) };
    state.addTarget = null;
    const draw = () => {
      const o = friendById(f.opponent);
      render(`
        ${header('התערבות חדשה', { close: true })}
        <div class="tabs" role="tablist" aria-label="נושא">${Object.entries(BET_CATS).map(([k, l]) => `<button class="tab" role="tab" data-cat="${k}" aria-selected="${f.category === k}">${l}</button>`).join('')}</div>
        ${BET_TEMPLATES[f.category].length ? `<div class="wrap">${BET_TEMPLATES[f.category].map((t) => `<button class="chip" data-tpl="${esc(t)}" aria-pressed="${f.topic === t}">${esc(t)}</button>`).join('')}</div>` : ''}
        <label class="field">על מה מתערבים?
          <input class="input" id="topic" maxlength="80" value="${esc(f.topic)}" placeholder="למשל: מכבי לוקחת אליפות השנה" style="font-family:var(--display);font-weight:700">
        </label>
        <section class="col"><h3>עם מי?</h3>${friendPicker(f.opponent, 'data-opp')}</section>
        <section aria-label="הצדדים" style="position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <label class="card lime col" style="gap:6px;align-items:center;box-shadow:var(--sh-m)"><span class="small">${me('אני אומרת', 'אני אומר', 'אנחנו אומרים')}</span>
            <input class="input" id="myside" maxlength="30" value="${esc(f.mySide)}" style="height:44px;text-align:center;font-family:var(--display);font-weight:900;font-size:20px"></label>
          <label class="card col" style="gap:6px;align-items:center;box-shadow:none"><span class="small">${o ? `${esc(o.display_name)} ${G(o.pronoun, 'אומרת', 'אומר', 'אומרים')}` : 'החבר אומר'}</span>
            <input class="input" id="theirside" maxlength="30" value="${esc(f.theirSide)}" style="height:44px;text-align:center;font-family:var(--display);font-weight:900;font-size:20px"></label>
          <span aria-hidden="true" class="ltr display" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-8deg);width:44px;height:44px;border-radius:22px;background:var(--ink);color:var(--cream);border:2.5px solid var(--cream);display:flex;align-items:center;justify-content:center;font-size:15px;pointer-events:none">VS</span>
        </section>
        <section class="col"><h3>מה המפסיד חייב?</h3>
          <div class="grid2">${Object.entries(STAKES).map(([k, l]) => `<button class="chip center" data-stake="${k}" aria-pressed="${f.stake === k}" style="min-height:46px">${l}</button>`).join('')}</div>
          ${f.stake === 'custom' ? `<input class="input" id="staketext" maxlength="60" value="${esc(f.stakeText)}" placeholder="למשל: שוטף לי את האוטו">` : ''}
        </section>
        <label class="check" style="justify-content:space-between"><span>מתי יודעים?<span class="sub">נזכיר לשניכם יום לפני</span></span>
          <input type="date" id="date" class="input" style="width:auto;height:44px" min="${todayStr()}" value="${esc(f.resolveOn)}"></label>
        <p class="card peach flat small" id="modwarn" role="alert" hidden style="margin:0"></p>
        <button class="btn" id="send" style="background:var(--chili)">לזרוק את הכפפה</button>
        <p class="micro muted center" style="margin:-8px 0 0">רק על קפה, טובות והתנצלויות. אף פעם לא על כסף.</p>`);
      wireBack('bets');
      const $send = $app.querySelector('#send'); const $warn = $app.querySelector('#modwarn');
      const read = () => {
        f.topic = $app.querySelector('#topic').value; f.mySide = $app.querySelector('#myside').value; f.theirSide = $app.querySelector('#theirside').value;
        f.resolveOn = $app.querySelector('#date').value; const st = $app.querySelector('#staketext'); if (st) f.stakeText = st.value;
      };
      const validate = () => {
        read();
        const bad = modWarn($warn, [f.topic, f.mySide, f.theirSide, f.stakeText].join(' '));
        $send.disabled = !!bad || !f.opponent || f.topic.trim().length < 2 || !f.mySide.trim() || !f.theirSide.trim() || !f.resolveOn || (f.stake === 'custom' && !f.stakeText.trim());
      };
      $app.querySelectorAll('input').forEach((i) => i.addEventListener('input', validate));
      on('[data-cat]', 'click', (e) => { read(); f.category = e.currentTarget.dataset.cat; draw(); });
      on('[data-tpl]', 'click', (e) => { read(); f.topic = e.currentTarget.dataset.tpl; draw(); });
      on('[data-opp]', 'click', (e) => { read(); f.opponent = e.currentTarget.dataset.opp; draw(); });
      on('[data-stake]', 'click', (e) => { read(); f.stake = e.currentTarget.dataset.stake; draw(); });
      validate();
      $send.onclick = async () => {
        $send.disabled = true;
        try {
          const id = await api.createBet({ ...f, topic: f.topic.trim(), mySide: f.mySide.trim(), theirSide: f.theirSide.trim(), stakeText: f.stakeText.trim() });
          api.log('bet_created', { category: f.category, stake: f.stake });
          toast('הכפפה נזרקה. מחכים לתשובה'); go('bet/' + id);
        } catch (err) { toast(errText(err)); $send.disabled = false; }
      };
    };
    draw();
  }

  // ───────────── One bet ─────────────
  async function screenBet(id) {
    loading();
    const bets = await api.myBets();
    const b = bets.find((x) => x.id === id);
    if (!b) return go('bets');
    const o = b.other_name; const op = b.other_pronoun;
    const sides = (big) => `<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px">
      <div class="card lime flat col center" style="gap:2px;padding:8px"><span class="micro">${me('את', 'אתה', 'אתם')}</span><span class="display" style="font-size:${big ? 20 : 17}px">${esc(b.my_side)}</span></div>
      <span class="display ltr" style="font-size:14px">VS</span>
      <div class="card cream flat col center" style="gap:2px;padding:8px"><span class="micro">${esc(o)}</span><span class="display" style="font-size:${big ? 20 : 17}px">${esc(b.their_side)}</span></div></div>`;
    const betCard = (shadow) => `<article class="sticker" style="box-shadow:6px 6px 0 ${shadow || 'var(--lime)'}">
      <div class="wrap"><span class="tag lime">התערבות</span><span class="tag">${BET_CATS[b.category] || ''}</span><span class="tag">עד ${new Date(b.resolve_on).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })}</span></div>
      <span class="display" style="font-size:22px;line-height:1.15">${esc(b.topic)}</span>${sides(true)}
      <div class="row between" style="border-top:2px dashed var(--ink);padding-top:10px"><span class="small">המפסיד חייב</span><b class="display" style="font-size:16px">${esc(stakeLabel(b))}</b></div></article>`;

    // Invitation
    if (b.status === 'proposed' && b.awaiting_me) {
      api.log('bet_invite_viewed');
      render(`
        <div class="card cream row" style="align-items:flex-start"><span class="av lime" style="border-radius:10px;width:36px;height:36px;font-size:15px">K.</span>
          <div><div class="micro"><b>KARMA. · ${timeAgo(b.created_at)}</b></div><b>${esc(o)} ${G(op, 'זרקה', 'זרק', 'זרקו')} ${me('עלייך', 'עליך', 'עליכם')} כפפה</b></div></div>
        <div class="ltr" style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;margin-top:6px">
          <span class="display" style="font-size:46px;line-height:.95">You've been</span>
          <span class="display" style="font-size:52px;line-height:.95;color:var(--lime)">CHALLENGED!</span></div>
        ${betCard()}
        <div id="counter" hidden class="card cream col"><b>מה ${me('את מציעה', 'אתה מציע', 'אתם מציעים')} במקום?</b>
          <div class="grid2">${Object.entries(STAKES).filter(([k]) => k !== 'custom').map(([k, l]) => `<button class="chip center" data-cs="${k}" aria-pressed="false">${l}</button>`).join('')}</div></div>
        <div class="stack-bottom">
          <button class="btn lime" data-a="accept">${me('אני בפנים', 'אני בפנים', 'אנחנו בפנים')}</button>
          <button class="btn md white" data-a="counter">להציע מחיר אחר</button>
          <button class="btn ghost" data-a="decline">לא בא לי, תודה</button>
        </div>`, { dark: true });
      on('[data-a]', 'click', async (e) => {
        const a = e.currentTarget.dataset.a;
        if (a === 'counter') { $app.querySelector('#counter').hidden = false; return; }
        try { await api.respondBet(id, a); api.log('bet_' + a); toast(a === 'accept' ? 'יאללה! ההתערבות פתוחה' : 'אולי בפעם הבאה'); go(a === 'accept' ? 'bet/' + id : 'bets'); } catch (err) { toast(errText(err)); }
      });
      on('[data-cs]', 'click', async (e) => {
        try { await api.respondBet(id, 'counter', e.currentTarget.dataset.cs, ''); api.log('bet_counter'); toast(`ההצעה נשלחה ל${o}`); go('bets'); } catch (err) { toast(errText(err)); }
      });
      return;
    }

    // Resolved
    if (b.status === 'resolved') {
      const won = b.i_won;
      render(`
        ${header(won ? 'ניצחת!' : 'הפסדת. בכבוד.')}
        <article class="card col" style="gap:4px;box-shadow:none"><span class="micro muted"><b>מול ${esc(o)}</b></span><span class="display" style="font-size:19px">${esc(b.topic)}</span></article>
        <article class="sticker" style="background:var(--ink);color:var(--cream);box-shadow:6px 6px 0 ${won ? 'var(--chili)' : 'var(--pink)'}">
          <span class="display ltr" style="font-size:13px;letter-spacing:.4px;color:var(--lime);text-align:right">${won ? 'YOU WIN' : 'GOOD GAME'}</span>
          <span class="display" style="font-size:28px;line-height:1.08">${won ? `${esc(o)} ${G(op, 'חייבת', 'חייב', 'חייבים')} ${me('לך', 'לך', 'לכם')}` : `${me('את חייבת', 'אתה חייב', 'אתם חייבים')} ל${esc(o)}`}<br>${esc(stakeLabel(b))}</span>
          <span class="small" style="color:#E8DDE2">${b.paid ? 'שולם. החשבון סגור.' : won ? `כשזה קורה, ${me('תסמני', 'תסמן', 'תסמנו')} שקיבלת.` : 'הקארמה מחכה.'}</span>
        </article>
        <div class="stack-bottom">
          ${won && !b.paid ? `<button class="btn" data-paid>קיבלתי, סגרנו</button>` : ''}
          ${!won && !b.paid ? `<a class="btn pink" href="#/good-new/${esc(b.other)}">לשלם עם קארמה טובה</a>` : ''}
          <button class="btn md white" data-share>לשתף</button>
        </div>`);
      wireBack('bets');
      on('[data-paid]', 'click', async () => { try { await api.markBetPaid(id); api.log('bet_paid'); toast('נגבה. קארמה מאוזנת'); screenBet(id); } catch (err) { toast(errText(err)); } });
      on('[data-share]', 'click', async () => {
        api.log('bet_shared');
        const text = `${won ? 'ניצחתי' : 'הפסדתי'} בהתערבות ב-KARMA.: ${b.topic} 🏆\n${inviteBase()}`;
        try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('הועתק'); } } catch (e) {}
      });
      return;
    }

    // Proposed (waiting for them), active, disputed, declined
    const dl = daysLeft(b.resolve_on);
    const waitingThem = b.status === 'proposed';
    let middle = '';
    if (waitingThem) middle = `<div class="card cream flat center small">מחכים ש${esc(o)} ${G(op, 'תענה', 'יענה', 'יענו')}${b.i_created ? '' : ` על ההצעה ${me('שלך', 'שלך', 'שלכם')}`}.</div>`;
    else if (b.status === 'declined') middle = `<div class="card cream flat center">${esc(o)} לא ${G(op, 'נכנסה', 'נכנס', 'נכנסו')} הפעם.</div>`;
    else {
      const claimed = b.my_claim && b.status === 'active';
      middle = `
        ${b.status === 'disputed' ? `<div class="card peach col"><b>לא מסכימים מי ניצח.</b><span class="small">דברו על זה, ואז ${me('סמני', 'סמן', 'סמנו')} שוב. אם עדיין לא מסכימים, הקבוצה תכריע (בקרוב).</span></div>` : ''}
        <div class="row between"><h2>${dl.past ? 'נגמר. מי צדק?' : 'כבר יודעים מי צדק?'}</h2><span class="tag ${dl.hot ? 'pink' : 'peach'}">${dl.t}</span></div>
        ${claimed ? `<div class="card lav row">${CHECK}<span>${me('סימנת', 'סימנת', 'סימנתם')} ש${b.my_claim === api.myId() ? me('את צדקת', 'אתה צדקת', 'אתם צדקתם') : `${esc(o)} ${G(op, 'צדקה', 'צדק', 'צדקו')}`}. מחכים ל${esc(o)}.</span></div>` : `
        <div class="grid2">
          <button class="card lime col center" data-claim="${esc(api.myId())}" style="gap:4px;box-shadow:var(--sh-m)"><b>${me('אני צדקתי', 'אני צדקתי', 'אנחנו צדקנו')}</b><span class="small">״${esc(b.my_side)}״</span></button>
          <button class="card col center" data-claim="${esc(b.other)}" style="gap:4px;box-shadow:none"><b>${esc(o)} ${G(op, 'צדקה', 'צדק', 'צדקו')}</b><span class="small">״${esc(b.their_side)}״</span></button>
        </div>`}`;
    }
    render(`
      ${header('התערבות')}
      ${betCard('var(--ink)')}
      ${middle}
      <div class="stack-bottom">
        ${waitingThem && b.i_created ? '<button class="btn ghost" data-cancel>לבטל את ההתערבות</button>' : ''}
        <a class="btn md white" href="#/bets">לכל ההתערבויות</a>
      </div>`);
    wireBack('bets');
    on('[data-claim]', 'click', async (e) => {
      const w = e.currentTarget.dataset.claim;
      try {
        const r = await api.claimBet(id, w); api.log('bet_claimed', { result: r });
        toast(r === 'resolved' ? 'יש תוצאה!' : r === 'disputed' ? 'לא מסכימים. דברו על זה' : `נשמר. מחכים ל${o}`); screenBet(id);
      } catch (err) { toast(errText(err)); }
    });
    on('[data-cancel]', 'click', async () => { try { await api.cancelBet(id); toast('בוטל'); go('bets'); } catch (err) { toast(errText(err)); } });
  }

  // ───────────── Good karma hub ─────────────
  async function screenGood() {
    loading();
    const [inbox, sent, cards, forMe] = await Promise.all([api.karmaInbox(), api.karmaSent(), api.myGroupCards(), api.groupCardsForMe(), loadFriends()]);
    const month = (iso) => Date.now() - new Date(iso) < 30 * 864e5;
    const got = inbox.filter((k) => month(k.delivered_at)).length;
    const gave = sent.filter((k) => !k.scheduled && month(k.deliver_at)).length;
    const pending = sent.filter((k) => k.scheduled);
    const revealAsks = sent.filter((k) => k.reveal_status === 'open');
    const openCards = cards.filter((c) => !c.delivered);
    const kItem = (k) => `<a class="beef" href="#/karma/${esc(k.id)}" style="background:${k.kind === 'compliment' ? 'var(--ink);color:var(--cream)' : 'var(--pink-soft)'}">
      ${k.sender_name ? av(k.sender_name, k.sender_color) : '<span class="av anon">?</span>'}
      <span class="body"><span class="reason" ${k.kind === 'compliment' ? 'style="color:var(--cream)"' : ''}>${esc(k.kind === 'compliment' ? k.message : k.occasion || k.message || 'קארמה טובה')}</span>
      <span class="meta" ${k.kind === 'compliment' ? 'style="color:#CBBFC5"' : ''}>${k.sender_name ? esc(k.sender_name) : 'מישהו מהחברים'} · ${timeAgo(k.delivered_at)}${k.can_pass ? ' · אפשר להעביר הלאה' : ''}</span></span></a>`;
    render(`
      ${homeHeader()}
      ${navTabs('good')}
      <section class="card hero pink" aria-label="קארמה טובה">
        <div class="ltr display" style="font-size:13px;font-weight:700;text-align:left">GOOD KARMA</div>
        <div class="row" style="gap:18px;align-items:flex-end">
          <div class="col" style="gap:2px"><span class="counter" style="font-size:64px">${got}</span><span class="small"><b>קיבלת החודש</b></span></div>
          <div class="col" style="gap:2px"><span class="counter" style="font-size:64px">${gave}</span><span class="small"><b>נתת החודש</b></span></div>
        </div>
        <div class="grid2">
          <a class="btn md white" href="#/good-new">קארמה טובה</a>
          <a class="btn md dark" href="#/compliment">מחמאה אנונימית</a>
          <a class="btn md white" href="#/card-new">קופה משותפת</a>
          <a class="btn md white" href="#/donate">תרומה בשם מישהו</a>
        </div>
      </section>
      ${revealAsks.map((k) => `<div class="card lime col"><b>${esc(k.recipient_name)} רוצה לדעת שהמחמאה ״${esc(k.message)}״ ממך</b>
        <div class="row" style="gap:8px"><button class="btn md dark" data-kr="${esc(k.id)}" data-yes="1" style="flex:1">לחשוף</button><button class="btn md white" data-kr="${esc(k.id)}" data-yes="0" style="flex:1">להישאר בצל</button></div></div>`).join('')}
      ${forMe.map((c) => `<a class="card lime row" href="#/card/${esc(c.id)}" style="text-decoration:none"><span style="flex:1"><b>כרטיס קבוצתי בשבילך!</b><br><span class="small">${esc(c.title)} · ${c.members} חברים כתבו</span></span>${ICON.back.replace('M9 6l6 6-6 6', 'M15 6l-6 6 6 6')}</a>`).join('')}
      ${inbox.length ? `<div class="sec"><h2>קיבלת</h2><span class="small">${inbox.length}</span></div><div class="col">${inbox.slice(0, 6).map(kItem).join('')}</div>` : ''}
      ${openCards.length ? `<div class="sec"><h2>קופות פתוחות</h2></div><div class="col">${openCards.map((c) => `<a class="beef" href="#/card/${esc(c.id)}">${av(c.recipient_name, c.recipient_color)}
        <span class="body"><span class="reason">${esc(c.title)}</span><span class="meta">בשביל ${esc(c.recipient_name)} · ${c.joined_count} מתוך ${c.members} בפנים</span></span>${c.joined ? '' : '<span class="status in_progress" style="direction:rtl">הוזמנת</span>'}</a>`).join('')}</div>` : ''}
      ${pending.length ? `<div class="sec"><h2>מתוזמנות</h2></div><div class="col">${pending.map((k) => `<div class="beef">${av(k.recipient_name, k.recipient_color)}
        <span class="body"><span class="reason">${esc(k.occasion || k.message || 'קארמה טובה')}</span><span class="meta">ל${esc(k.recipient_name)} · ${whenText(k.deliver_at)}</span></span>
        <button class="btn md white" style="width:auto;min-height:36px;padding:0 10px;font-size:12px" data-cancelk="${esc(k.id)}">לבטל</button></div>`).join('')}</div>` : ''}
      <div class="sec"><h2>החברים שלי</h2></div>
      <div class="col">${state.friends.length ? state.friends.map((x) => `<a class="beef" href="#/friend/${esc(x.id)}" style="box-shadow:none">${av(x.display_name, x.color)}<span class="body"><span class="reason">${esc(x.display_name)}</span><span class="meta">המאזן, ומה משמח ${G(x.pronoun, 'אותה', 'אותו', 'אותם')}</span></span></a>`).join('') : '<a class="btn md white" href="#/friends">להזמין חברים</a>'}</div>
      <a class="card cream row" href="#/wishlist" style="text-decoration:none;box-shadow:none"><span style="flex:1"><b>מה משמח אותי</b><br><span class="small">ככה החברים ידעו מה לשלוח ${me('לך', 'לך', 'לכם')}</span></span></a>
      <div style="height:70px"></div>`, { after: `<a class="fab" href="#/good-new" aria-label="קארמה טובה חדשה" style="background:var(--pink)">${ICON.plus}</a>` });
    on('[data-cancelk]', 'click', async (e) => { try { await api.cancelKarma(e.currentTarget.dataset.cancelk); toast('בוטל'); screenGood(); } catch (err) { toast(errText(err)); } });
    on('[data-kr]', 'click', async (e) => {
      const yes = e.currentTarget.dataset.yes === '1';
      try { await api.respondKarmaReveal(e.currentTarget.dataset.kr, yes); toast(yes ? 'נחשפת. עכשיו יודעים שזה ממך' : 'נשארת בצל'); screenGood(); } catch (err) { toast(errText(err)); }
    });
  }

  // ───────────── Send good karma / compliment / pass it on ─────────────
  async function screenGoodNew(opts) {
    loading();
    const [inbox] = await Promise.all([opts.passFrom ? api.karmaInbox() : Promise.resolve([]), loadFriends()]);
    const src = opts.passFrom ? inbox.find((k) => k.id === opts.passFrom && k.can_pass) : null;
    if (opts.passFrom && !src) { toast('עברו 24 שעות, השרשרת נסגרה. אפשר לשלוח קארמה רגילה'); return go('good-new'); }
    const friends = src && src.sender ? state.friends.filter((x) => x.id !== src.sender) : state.friends;
    if (!friends.length) return noFriends('קארמה טובה');
    const f = { recipient: opts.to || null, kind: opts.compliment ? 'compliment' : 'karma', occasion: '', message: '', gift: 'words', when: 'now', at: '' };
    let prof = null;
    const loadProf = async () => { prof = f.recipient ? await api.friendProfile(f.recipient).catch(() => null) : null; };
    await loadProf();
    const draw = () => {
      const t = friendById(f.recipient); const pron = t ? t.pronoun : 'f';
      const isC = f.kind === 'compliment';
      const likes = (prof && prof.likes) || {};
      const likeBits = [likes.coffee, likes.sweet, ...(likes.places || []), ...(likes.tags || [])].filter(Boolean);
      const bday = prof && nextBirthday(prof.birthday);
      const title = src ? 'להעביר הלאה' : isC ? 'מחמאה אנונימית' : 'קארמה טובה';
      render(`
        <header class="top"><div class="col" style="gap:2px"><span class="display ltr" style="font-size:13px;color:#C2185B;text-align:right">${src ? 'PASS IT ON' : isC ? 'ANONYMOUS' : 'GOOD KARMA'}</span><h1>${title}</h1></div>
          <button class="icon-btn" data-back aria-label="סגירה">${ICON.close}</button></header>
        ${src ? `<div class="card col" style="gap:6px"><b>הקארמה הזאת עברה כבר דרך ${src.chain_length} ${src.chain_length === 1 ? 'אדם' : 'אנשים'}</b><span class="small">יש ${me('לך', 'לך', 'לכם')} עד ${whenText(src.pass_until)} להעביר אותה למישהו שמגיע לו.</span></div>` : `
        <div class="seg" role="group" aria-label="סוג"><button type="button" data-kind="karma" aria-pressed="${!isC}">קארמה טובה</button><button type="button" data-kind="compliment" aria-pressed="${isC}">מחמאה אנונימית</button></div>`}
        <section class="col"><h3>למי?</h3>${friendPicker(f.recipient, 'data-to', friends)}</section>
        ${isC ? `
        <section class="col"><h3>מה ${me('את חושבת', 'אתה חושב', 'אתם חושבים')} ${t ? `על ${esc(t.display_name)}` : ''}?</h3>
          <div class="wrap">${COMPLIMENTS.map((c) => G(pron, c[0], c[1], c[2])).map((c) => `<button class="chip" data-comp="${esc(c)}" aria-pressed="${f.message === c}">${esc(c)}</button>`).join('')}</div></section>
        <label class="field">או במילים ${me('שלך', 'שלך', 'שלכם')}<textarea class="input" id="msg" maxlength="140" placeholder="מה ${me('את אוהבת', 'אתה אוהב', 'אתם אוהבים')} בה/בו?">${esc(f.message)}</textarea></label>
        <div class="card lav flat small">${t ? esc(t.display_name) : 'החבר'} ${G(pron, 'לא תדע', 'לא ידע', 'לא ידעו')} שזה ממך, אלא אם ${G(pron, 'תבקש', 'יבקש', 'יבקשו')} ו${me('תסכימי', 'תסכים', 'תסכימו')}.</div>` : `
        <section class="col"><h3>למה?</h3>
          <div class="wrap">${OCCASIONS.map((o) => `<button class="chip" data-occ="${esc(o)}" aria-pressed="${f.occasion === o}">${esc(o)}</button>`).join('')}</div></section>
        ${likeBits.length ? `<div class="card lav flat small col" style="gap:4px"><b>מה משמח את ${esc(t.display_name)}</b><span>${likeBits.map(esc).join(' · ')}</span></div>` : ''}
        <section class="col"><h3>מצרפים משהו?</h3>
          <div class="grid3">${Object.entries(GIFTS).map(([k, g]) => `<button class="spice" data-gift="${k}" aria-pressed="${f.gift === k}" style="height:68px"><span>${g.t}</span><span class="micro" style="font-weight:400">${g.s}</span></button>`).join('')}</div>
          ${f.gift !== 'words' ? '<p class="card peach flat small" style="margin:0">מתנות בתשלום יגיעו בקרוב. בינתיים זה יישלח עם המילים, ורשמנו שרצית.</p>' : ''}
        </section>
        <label class="field">כמה מילים (לא חובה)<textarea class="input" id="msg" maxlength="140" placeholder="למשל: אין עלייך. הקפה הזה בשבילך">${esc(f.message)}</textarea></label>`}
        <section class="col"><h3>מתי זה יגיע?</h3>
          <div class="wrap">
            ${[['now', 'עכשיו'], ['morning', 'מחר בבוקר'], ...(bday ? [['bday', `ביום ההולדת (${bdayText(prof.birthday)})`]] : []), ['surprise', 'הפתעה השבוע'], ['custom', 'תאריך ושעה']].map(([k, l]) => `<button class="chip" data-when="${k}" aria-pressed="${f.when === k}">${l}</button>`).join('')}
          </div>
          ${f.when === 'custom' ? `<input type="datetime-local" class="input" id="at" value="${esc(f.at)}" min="${new Date(Date.now() + 36e5).toISOString().slice(0, 16)}">` : ''}
        </section>
        <p class="card peach flat small" id="modwarn" role="alert" hidden style="margin:0"></p>
        <button class="btn pink" id="send">${src ? 'להעביר הלאה' : isC ? 'לשלוח בעילום שם' : 'לשלוח קארמה טובה'}</button>`, { theme: 'pink' });
      wireBack(src ? 'karma/' + src.id : 'good');
      const $send = $app.querySelector('#send'); const $warn = $app.querySelector('#modwarn');
      const read = () => { const m = $app.querySelector('#msg'); if (m) f.message = m.value; const a = $app.querySelector('#at'); if (a) f.at = a.value; };
      const validate = () => {
        read();
        const bad = modWarn($warn, f.message);
        $send.disabled = !!bad || !f.recipient || (isC && f.message.trim().length < 2) || (!isC && !f.occasion && !f.message.trim()) || (f.when === 'custom' && !f.at);
      };
      $app.querySelectorAll('textarea,input').forEach((i) => i.addEventListener('input', validate));
      on('[data-kind]', 'click', (e) => { read(); f.kind = e.currentTarget.dataset.kind; f.message = ''; draw(); });
      on('[data-to]', 'click', async (e) => { read(); f.recipient = e.currentTarget.dataset.to; await loadProf(); if (f.when === 'bday') f.when = 'now'; draw(); });
      on('[data-comp]', 'click', (e) => { f.message = e.currentTarget.dataset.comp; draw(); });
      on('[data-occ]', 'click', (e) => { read(); f.occasion = f.occasion === e.currentTarget.dataset.occ ? '' : e.currentTarget.dataset.occ; draw(); });
      on('[data-gift]', 'click', (e) => { read(); f.gift = e.currentTarget.dataset.gift; if (f.gift !== 'words') api.log('gift_interest', { gift: f.gift, where: 'good_karma' }); draw(); });
      on('[data-when]', 'click', (e) => { read(); f.when = e.currentTarget.dataset.when; draw(); });
      validate();
      $send.onclick = async () => {
        read(); $send.disabled = true;
        let at = null;
        if (f.when === 'morning') { const d = new Date(Date.now() + 864e5); d.setHours(8, 0, 0, 0); at = d; }
        if (f.when === 'bday') at = nextBirthday(prof.birthday);
        if (f.when === 'surprise') { const d = new Date(Date.now() + (1 + Math.floor(Math.random() * 5)) * 864e5); d.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0); at = d; }
        if (f.when === 'custom') at = new Date(f.at);
        try {
          await api.sendKarma({ recipient: f.recipient, kind: f.kind, occasion: isC ? '' : f.occasion, message: f.message.trim(), gift: f.gift, anonymous: isC, deliverAt: at ? at.toISOString() : null, passFrom: src ? src.id : null });
          api.log(src ? 'karma_passed' : f.kind === 'compliment' ? 'compliment_sent' : 'karma_sent', { when: f.when, gift: f.gift });
          toast(at ? (f.when === 'surprise' ? `מתוזמן להפתעה. גם ${me('את לא יודעת', 'אתה לא יודע', 'אתם לא יודעים')} מתי` : `יגיע ${whenText(at.toISOString())}`) : 'נשלח! קארמה טובה בדרך');
          go('good');
        } catch (err) { toast(errText(err)); $send.disabled = false; }
      };
    };
    draw();
  }

  // ───────────── Received karma / compliment ─────────────
  async function screenKarma(id) {
    loading();
    const [inbox] = await Promise.all([api.karmaInbox(), loadFriends()]);
    const k = inbox.find((x) => x.id === id);
    if (!k) return go('good');
    const seen = store.get('karma_k_seen', []); if (!seen.includes(id)) { seen.push(id); store.set('karma_k_seen', seen.slice(-200)); }
    api.log('karma_viewed', { kind: k.kind });
    const leftH = Math.max(0, Math.round((new Date(k.pass_until) - Date.now()) / 36e5));
    if (k.kind === 'compliment') {
      render(`
        <div class="card cream row" style="align-items:flex-start"><span class="av pink" style="border-radius:10px;width:36px;height:36px;font-size:15px">K.</span>
          <div><div class="micro"><b>KARMA. · ${timeAgo(k.delivered_at)}</b></div><b>${k.sender_name ? `${esc(k.sender_name)} ${G((friendById(k.sender) || {}).pronoun, 'חושבת', 'חושב', 'חושבים')} ${me('עלייך', 'עליך', 'עליכם')} משהו טוב` : `מישהו חושב ${me('עלייך', 'עליך', 'עליכם')} משהו טוב`}</b></div></div>
        <div class="ltr" style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin-top:20px">
          <span class="display" style="font-size:44px;line-height:.95">Someone thinks</span>
          <span class="display" style="font-size:44px;line-height:.95;color:var(--pink)">you're the best.</span></div>
        <article class="sticker" style="background:var(--pink);border-color:var(--cream);box-shadow:6px 6px 0 var(--cream)">
          <span class="small"><b>${k.sender_name ? `${esc(k.sender_name)} ${G((friendById(k.sender) || {}).pronoun, 'חושבת', 'חושב', 'חושבים')}` : 'מישהו מהחבורה חושב'} ${me('שאת', 'שאתה', 'שאתם')}</b></span>
          <span class="display" style="font-size:28px;line-height:1.08">${esc(k.message)}</span>
          ${k.sender_name ? '' : '<span class="small blur">שירה מהעבודה</span>'}
        </article>
        <div class="stack-bottom">
          ${k.sender_name ? '' : k.reveal_status === 'open' ? '<p class="center small" style="margin:0">ביקשת לדעת מי. מחכים לתשובה</p>' : k.reveal_status === 'declined' ? '<p class="center small" style="margin:0">מעדיפים להישאר בצל. וזה בסדר</p>' : '<button class="btn pink" data-reveal>לבקש לגלות מי</button>'}
          <a class="btn md white" href="#/compliment">לשלוח מחמאה למישהו אחר</a>
          <button class="btn ghost" data-back>חזרה</button>
        </div>`, { dark: true });
      on('[data-back]', 'click', () => back('good'));
      on('[data-reveal]', 'click', async (e) => { e.currentTarget.disabled = true; try { await api.requestKarmaReveal(id); api.log('compliment_reveal_requested'); toast(`נשלח. אם ירצו, ${me('תדעי', 'תדע', 'תדעו')} מי`); screenKarma(id); } catch (err) { toast(errText(err)); } });
      return;
    }
    render(`
      <div class="card cream row" style="align-items:flex-start"><span class="av pink" style="border-radius:10px;width:36px;height:36px;font-size:15px">K.</span>
        <div><div class="micro"><b>KARMA. · ${timeAgo(k.delivered_at)}</b></div><b>${esc(k.sender_name || 'מישהו')} ${me('שלח לך', 'שלח לך', 'שלח לכם')} קארמה טובה</b>
        <div class="small">ולא, ${me('את לא חייבת', 'אתה לא חייב', 'אתם לא חייבים')} כלום בחזרה.</div></div></div>
      <div class="ltr" style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;margin-top:20px">
        <span class="display" style="font-size:44px;line-height:.95">You've got</span>
        <span class="display" style="font-size:54px;line-height:.95;color:var(--cream);-webkit-text-stroke:2px var(--ink)">GOOD KARMA</span></div>
      <article class="sticker" style="transform:rotate(2deg);box-shadow:6px 6px 0 var(--ink)">
        ${k.occasion ? `<span class="tag pink" style="align-self:flex-start">${esc(k.occasion)}</span>` : ''}
        ${k.message ? `<span class="display" style="font-size:19px;line-height:1.3;font-weight:700">״${esc(k.message)}״</span>` : ''}
        <span class="small muted">${esc(k.sender_name || '')}</span>
        ${k.chain_length > 1 ? `<span class="small"><b>הקארמה הזאת עברה כבר דרך ${k.chain_length} אנשים</b></span>` : ''}
      </article>
      <div class="stack-bottom">
        ${k.can_pass ? `<a class="btn" href="#/pass/${esc(k.id)}" style="background:var(--cream)">להעביר הלאה · נשארו ${leftH} שעות</a>` : ''}
        ${k.thanked ? `<p class="center small" style="margin:0">${CHECK} ${me('שלחת', 'שלחת', 'שלחתם')} תודה</p>` : '<button class="btn md white" data-thank>לשלוח תודה</button>'}
        ${k.sender ? `<a class="btn ghost" href="#/good-new/${esc(k.sender)}">להחזיר קארמה טובה</a>` : ''}
      </div>`, { theme: 'hotpink' });
    on('[data-thank]', 'click', async (e) => { e.currentTarget.disabled = true; try { await api.thankKarma(id); api.log('karma_thanked'); toast('התודה נשלחה'); screenKarma(id); } catch (err) { toast(errText(err)); } });
  }

  // ───────────── Balance with one friend ─────────────
  async function screenFriend(id) {
    loading();
    const [prof, tl] = await Promise.all([api.friendProfile(id), api.friendTimeline(id), loadFriends()]);
    if (!prof) return go('good');
    const good = tl.filter((x) => x.item === 'karma').length;
    const open = tl.filter((x) => x.item === 'beef' && ['pending', 'in_progress'].includes(x.status)).length;
    const total = Math.max(1, good + open);
    const likes = prof.likes || {};
    const likeBits = [likes.coffee, likes.sweet, ...(likes.places || []), ...(likes.tags || [])].filter(Boolean);
    const icon = (x) => x.item === 'karma' ? `<span class="av pink" style="width:30px;height:30px">${HEART}</span>`
      : x.item === 'bet' ? `<span class="av lime" style="width:30px;height:30px;font-size:11px">VS</span>`
      : `<span class="av ${['pending', 'in_progress'].includes(x.status) ? 'spicy' : 'lime'}" style="width:30px;height:30px;font-size:14px">${['pending', 'in_progress'].includes(x.status) ? '!' : CHECK}</span>`;
    const sub = (x) => x.item === 'karma' ? (x.mine ? 'שלחת קארמה טובה' : `${esc(prof.display_name)} ${G(prof.pronoun, 'שלחה', 'שלח', 'שלחו')} ${me('לך', 'לך', 'לכם')}`)
      : x.item === 'bet' ? (x.status === 'resolved' ? (x.mine ? 'התערבות · ניצחת' : 'התערבות · הפסדת') : 'התערבות פתוחה')
      : (x.mine ? 'טינה שלך' : 'טינה עלייך') + (['pending', 'in_progress'].includes(x.status) ? ' · עדיין פתוח' : ' · נסגר');
    render(`
      <header class="top"><div class="row" style="gap:12px">${av(prof.display_name, prof.color, 'lg')}
        <div class="col" style="gap:2px"><h1 style="font-size:24px">${me('את', 'אתה', 'אתם')} ו${esc(prof.display_name)}</h1>${prof.birthday ? `<span class="small muted">יום הולדת: ${bdayText(prof.birthday)}</span>` : ''}</div></div>
        <button class="icon-btn" data-back aria-label="חזרה">${ICON.back}</button></header>
      <section class="card hero col" aria-label="המאזן" style="background:var(--white)">
        <div class="row between"><span class="display ltr" style="font-size:13px">KARMA BALANCE</span>${good >= open ? `<span class="tag pink">${me('את בפלוס', 'אתה בפלוס', 'אתם בפלוס')}</span>` : '<span class="tag peach">יש מה לסגור</span>'}</div>
        <div class="row between" style="align-items:flex-end">
          <div class="col" style="gap:2px"><span class="counter ltr" style="font-size:48px;color:#C2185B">+${good}</span><span class="micro"><b>קארמה טובה</b></span></div>
          <div class="col" style="gap:2px;align-items:flex-end"><span class="counter ltr" style="font-size:48px">−${open}</span><span class="micro"><b>חשבונות פתוחים</b></span></div>
        </div>
        <div role="img" aria-label="${good} טובות מול ${open} חשבונות פתוחים" style="display:flex;height:14px;border:2px solid var(--ink);border-radius:7px;overflow:hidden">
          <div style="width:${Math.round(good / total * 100)}%;background:var(--pink)"></div><div style="flex:1;background:${open ? 'var(--ink)' : 'var(--cream)'}"></div></div>
      </section>
      ${likeBits.length ? `<div class="card lav flat col" style="gap:4px"><b>מה משמח את ${esc(prof.display_name)}</b><span class="small">${likeBits.map(esc).join(' · ')}</span></div>` : ''}
      <div class="sec"><h2>מה היה ביניכם</h2></div>
      <div class="col">${tl.length ? tl.map((x) => `<div class="beef" style="box-shadow:none;${x.item === 'karma' ? 'background:var(--pink-soft)' : ''}">${icon(x)}<span class="body"><span class="reason">${esc(x.title)}</span><span class="meta">${sub(x)} · ${timeAgo(x.at)}</span></span></div>`).join('') : '<p class="muted small center">עוד לא קרה כלום. זה הזמן.</p>'}</div>
      <div class="grid3" style="margin-top:auto">
        <a class="btn md pink" href="#/good-new/${esc(id)}">קארמה טובה</a>
        <button class="btn md white" data-go="bet-new">התערבות</button>
        <button class="btn md white" data-go="add">טינה</button>
      </div>`);
    on('[data-back]', 'click', () => back('good'));
    on('[data-go]', 'click', (e) => { state.addTarget = id; go(e.currentTarget.dataset.go); });
  }

  // ───────────── What makes me happy ─────────────
  async function screenWishlist() {
    loading();
    const prof = await api.friendProfile(api.myId());
    const l = (prof && prof.likes) || {};
    const f = { coffee: l.coffee || '', sweet: l.sweet || '', places: l.places || [], tags: l.tags || [], birthday: (prof && prof.birthday) || '' };
    const [bm, bd] = f.birthday ? f.birthday.split('-') : ['', ''];
    render(`
      ${header('מה משמח אותי')}
      <p class="muted" style="margin:-8px 0 0">כשמישהו ישלח ${me('לך', 'לך', 'לכם')} קארמה טובה, הוא יראה את זה ויידע מה לבחור.</p>
      <label class="field">הקפה שלי<input class="input" id="coffee" maxlength="40" value="${esc(f.coffee)}" placeholder="למשל: הפוך גדול על שיבולת שועל"></label>
      <label class="field">המתוק שלי<input class="input" id="sweet" maxlength="40" value="${esc(f.sweet)}" placeholder="למשל: גלידת פיסטוק, בלי רוטב"></label>
      <section class="col"><h3>המקומות שלי</h3><div class="wrap">${PLACES.map((p) => `<button class="chip" data-place="${esc(p)}" aria-pressed="${f.places.includes(p)}">${esc(p)}</button>`).join('')}</div></section>
      <section class="col"><h3>עוד דברים ${me('שאני אוהבת', 'שאני אוהב', 'שאנחנו אוהבים')}</h3><div class="wrap">${TAGS.map((p) => `<button class="chip" data-tag="${esc(p)}" aria-pressed="${f.tags.includes(p)}">${esc(p)}</button>`).join('')}</div></section>
      <div class="check" style="justify-content:space-between"><span>יום ההולדת שלי<span class="sub">רק החברים יראו, בלי שנה</span></span>
        <span class="row" style="gap:6px"><select class="input" id="bd" style="width:70px;height:44px;padding:0 6px" aria-label="יום"><option value="">יום</option>${Array.from({ length: 31 }, (_, i) => `<option ${Number(bd) === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>
        <select class="input" id="bm" style="width:110px;height:44px;padding:0 6px" aria-label="חודש"><option value="">חודש</option>${MONTHS.map((m, i) => `<option value="${i + 1}" ${Number(bm) === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></span></div>
      <p class="card peach flat small" id="modwarn" role="alert" hidden style="margin:0"></p>
      <div class="stack-bottom"><button class="btn pink" id="save">לשמור</button></div>`);
    wireBack('good');
    const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    on('[data-place]', 'click', (e) => { f.places = toggle(f.places, e.currentTarget.dataset.place); e.currentTarget.setAttribute('aria-pressed', f.places.includes(e.currentTarget.dataset.place)); });
    on('[data-tag]', 'click', (e) => { f.tags = toggle(f.tags, e.currentTarget.dataset.tag); e.currentTarget.setAttribute('aria-pressed', f.tags.includes(e.currentTarget.dataset.tag)); });
    const $save = $app.querySelector('#save'); const $warn = $app.querySelector('#modwarn');
    const validate = () => { $save.disabled = !!modWarn($warn, $app.querySelector('#coffee').value + ' ' + $app.querySelector('#sweet').value); };
    on('#coffee', 'input', validate); on('#sweet', 'input', validate);
    $save.onclick = async () => {
      const d = $app.querySelector('#bd').value, m = $app.querySelector('#bm').value;
      const birthday = d && m ? `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
      const likes = { coffee: $app.querySelector('#coffee').value.trim(), sweet: $app.querySelector('#sweet').value.trim(), places: f.places, tags: f.tags };
      try { await api.updateLikes(likes, birthday); api.log('wishlist_saved', { n: f.places.length + f.tags.length }); toast('נשמר. עכשיו כולם יודעים'); go('good'); } catch (err) { toast(errText(err)); }
    };
  }

  // ───────────── Group card ("shared pot") ─────────────
  async function screenCardNew() {
    loading();
    await loadFriends();
    if (!state.friends.length) return noFriends('קופה משותפת');
    const TITLES = ['מגש פירות ליולדת', 'בירה אחרי הפרידה', 'עוגה ליום ההולדת', 'משהו קטן להחלמה', 'מזל טוב על העבודה החדשה'];
    const f = { recipient: null, title: '', closes: '1', message: '', invitees: [] };
    const draw = () => {
      const r = friendById(f.recipient);
      const others = state.friends.filter((x) => x.id !== f.recipient);
      render(`
        <header class="top"><div class="col" style="gap:2px"><span class="display ltr" style="font-size:13px;color:#C2185B;text-align:right">GROUP KARMA</span><h1>קופה משותפת</h1></div>
          <button class="icon-btn" data-back aria-label="סגירה">${ICON.close}</button></header>
        <section class="col"><h3>בשביל מי?</h3>${friendPicker(f.recipient, 'data-r')}</section>
        <section class="col"><h3>מה הסיפור?</h3><div class="wrap">${TITLES.map((t) => `<button class="chip" data-t="${esc(t)}" aria-pressed="${f.title === t}">${esc(t)}</button>`).join('')}</div>
          <input class="input" id="title" maxlength="60" value="${esc(f.title)}" placeholder="או לכתוב לבד"></section>
        ${f.recipient ? `<section class="col"><h3>מי עוד בפנים?</h3>${others.length ? friendPicker(f.invitees, 'data-inv', others) : `<p class="small muted" style="margin:0">אין עוד חברים להזמין. אפשר להזמין חברים חדשים ל-KARMA.</p>`}</section>` : ''}
        <section class="col"><h3>עד מתי?</h3><div class="wrap">${[['1', 'מחר בערב'], ['3', 'עוד 3 ימים'], ['7', 'עוד שבוע']].map(([k, l]) => `<button class="chip" data-c="${k}" aria-pressed="${f.closes === k}">${l}</button>`).join('')}</div></section>
        <label class="field">מה ${me('את כותבת', 'אתה כותב', 'אתם כותבים')}?<textarea class="input" id="msg" maxlength="140" placeholder="מזל טוב! הכי מגיע לך">${esc(f.message)}</textarea></label>
        <div class="card lav flat small">בינתיים זה כרטיס ברכה קבוצתי: כולם כותבים, ו${r ? esc(r.display_name) : 'החבר'} ${G(r && r.pronoun, 'מקבלת', 'מקבל', 'מקבלים')} הכול ביחד. האפשרות להוסיף כסף לקופה תגיע בקרוב.</div>
        <p class="card peach flat small" id="modwarn" role="alert" hidden style="margin:0"></p>
        <button class="btn pink" id="send">לפתוח את הקופה</button>`, { theme: 'pink' });
      wireBack('good');
      const $send = $app.querySelector('#send'); const $warn = $app.querySelector('#modwarn');
      const read = () => { f.title = $app.querySelector('#title').value; f.message = $app.querySelector('#msg').value; };
      const validate = () => { read(); const bad = modWarn($warn, f.title + ' ' + f.message); $send.disabled = !!bad || !f.recipient || f.title.trim().length < 2; };
      $app.querySelectorAll('input,textarea').forEach((i) => i.addEventListener('input', validate));
      on('[data-r]', 'click', (e) => { read(); f.recipient = e.currentTarget.dataset.r; f.invitees = f.invitees.filter((x) => x !== f.recipient); draw(); });
      on('[data-t]', 'click', (e) => { read(); f.title = e.currentTarget.dataset.t; draw(); });
      on('[data-inv]', 'click', (e) => { read(); const v = e.currentTarget.dataset.inv; f.invitees = f.invitees.includes(v) ? f.invitees.filter((x) => x !== v) : [...f.invitees, v]; draw(); });
      on('[data-c]', 'click', (e) => { read(); f.closes = e.currentTarget.dataset.c; draw(); });
      validate();
      $send.onclick = async () => {
        read(); $send.disabled = true;
        const d = new Date(Date.now() + Number(f.closes) * 864e5); d.setHours(20, 0, 0, 0);
        try {
          const id = await api.createGroupCard({ recipient: f.recipient, title: f.title.trim(), closesAt: d.toISOString(), message: f.message.trim(), invitees: f.invitees });
          api.log('group_card_created', { invited: f.invitees.length });
          toast('הקופה נפתחה. החברים קיבלו הזמנה'); go('card/' + id);
        } catch (err) { toast(errText(err)); $send.disabled = false; }
      };
    };
    draw();
  }

  async function screenCard(id) {
    loading();
    const [mine, forMe, msgs] = await Promise.all([api.myGroupCards(), api.groupCardsForMe(), api.groupCardMessages(id)]);
    const c = mine.find((x) => x.id === id);
    const rc = forMe.find((x) => x.id === id);
    if (!c && !rc) return go('good');
    if (rc && !c) {
      api.log('group_card_opened');
      render(`
        <div class="ltr" style="display:flex;flex-direction:column;align-items:flex-start;gap:2px;margin-top:10px">
          <span class="display" style="font-size:40px;line-height:.95">Everyone's got</span>
          <span class="display" style="font-size:52px;line-height:.95;color:var(--cream);-webkit-text-stroke:2px var(--ink)">YOUR BACK</span></div>
        <section class="sticker" style="box-shadow:6px 6px 0 var(--ink)"><span class="small"><b>${rc.members} חברים ביחד</b></span><span class="display" style="font-size:24px">${esc(rc.title)}</span></section>
        <div class="col">${msgs.filter((m) => m.joined).map((m) => `<div class="card row" style="align-items:flex-start;box-shadow:none">${av(m.name, m.color)}<div class="col" style="gap:2px"><b>${esc(m.name)}</b><span>${esc(m.message || '❤')}</span></div></div>`).join('')}</div>
        <div class="stack-bottom"><a class="btn md white" href="#/good">חזרה</a></div>`, { theme: 'hotpink' });
      return;
    }
    const pct = Math.round((c.joined_count / Math.max(1, c.members)) * 100);
    const hoursLeft = Math.max(0, Math.round((new Date(c.closes_at) - Date.now()) / 36e5));
    render(`
      <header class="top"><div class="col" style="gap:2px"><span class="display ltr" style="font-size:13px;color:#C2185B;text-align:right">GROUP KARMA</span><h1>קופה משותפת</h1></div>
        <button class="icon-btn" data-back aria-label="חזרה">${ICON.back}</button></header>
      <section class="card hero pink">
        <span class="small"><b>כל החבר'ה בשביל ${esc(c.recipient_name)}</b></span>
        <span class="display" style="font-size:24px;line-height:1.1">${esc(c.title)}</span>
        <div role="img" aria-label="${c.joined_count} מתוך ${c.members} בפנים" style="height:16px;border:2px solid var(--ink);border-radius:8px;background:var(--white);overflow:hidden"><div style="width:${pct}%;height:100%;background:var(--lime)"></div></div>
        <span class="small">${c.joined_count} מתוך ${c.members} בפנים · ${c.delivered ? 'נשלח!' : hoursLeft < 24 ? `נסגרת בעוד ${hoursLeft} שעות` : `נסגרת ${whenText(c.closes_at)}`}</span>
      </section>
      <div class="sec"><h2>מי כבר בפנים</h2></div>
      <div class="col">${msgs.map((m) => `<div class="beef" style="box-shadow:none;${m.joined ? '' : 'border-style:dashed'}">${av(m.name, m.color)}<span class="body"><span class="reason">${esc(m.name)}</span><span class="meta">${m.joined ? (m.message ? `״${esc(m.message)}״` : 'בפנים') : 'עוד לא הצטרף/ה'}</span></span>${m.joined ? '<span class="tag lime">בפנים</span>' : ''}</div>`).join('')}</div>
      ${!c.joined && !c.delivered ? `<label class="field">מה ${me('את כותבת', 'אתה כותב', 'אתם כותבים')} ל${esc(c.recipient_name)}?<textarea class="input" id="msg" maxlength="140" placeholder="הכי מגיע לך בעולם"></textarea></label>
        <p class="card peach flat small" id="modwarn" role="alert" hidden style="margin:0"></p>` : ''}
      <div class="stack-bottom">
        ${!c.joined && !c.delivered ? '<button class="btn pink" id="join">להצטרף לקופה</button>' : ''}
        ${c.i_created && !c.delivered ? `<button class="btn" id="deliver">לשלוח ל${esc(c.recipient_name)} עכשיו</button>` : ''}
        <button class="btn md white" data-money>להוסיף כסף לקופה · בקרוב</button>
      </div>`, { theme: 'pink' });
    wireBack('good');
    const $msg = $app.querySelector('#msg');
    if ($msg) { const $warn = $app.querySelector('#modwarn'); $msg.addEventListener('input', () => { $app.querySelector('#join').disabled = !!modWarn($warn, $msg.value); }); }
    on('#join', 'click', async (e) => { e.currentTarget.disabled = true; try { await api.joinGroupCard(id, $msg.value.trim()); api.log('group_card_joined'); toast('הצטרפת!'); screenCard(id); } catch (err) { toast(errText(err)); e.currentTarget.disabled = false; } });
    on('#deliver', 'click', async () => {
      const ok = await sheet(`לשלוח ל${c.recipient_name}?`, 'כל מה שנכתב עד עכשיו יישלח, ואי אפשר יהיה להוסיף אחר כך.', 'לשלוח', 'עוד לא');
      if (!ok) return;
      try { await api.deliverGroupCard(id); api.log('group_card_delivered', { members: c.joined_count }); toast('נשלח! איזה חברים'); screenCard(id); } catch (err) { toast(errText(err)); }
    });
    on('[data-money]', 'click', (e) => { api.log('gift_interest', { where: 'group_card' }); e.currentTarget.textContent = 'רשמנו שרצית. נעדכן'; e.currentTarget.disabled = true; });
  }

  // ───────────── Donation in someone's name (coming soon) ─────────────
  async function screenDonate() {
    await loadFriends();
    api.log('donate_viewed');
    const f = { occ: 'לזכר', to: null };
    const draw = () => {
      const t = friendById(f.to);
      render(`
        ${header('תרומה בשם מישהו')}
        <p class="muted" style="margin:-8px 0 0">לרגעים שבהם קפה לא מתאים. התרומה עוברת לעמותה, והחבר מקבל הודעה שקטה.</p>
        <span class="tag peach" style="align-self:flex-start">בקרוב</span>
        <section class="col"><h3>מה הרגע?</h3><div class="wrap">${['לזכר', 'לרפואה שלמה', 'תקופה קשה', 'סתם כי'].map((o) => `<button class="chip" data-o="${o}" aria-pressed="${f.occ === o}">${o}</button>`).join('')}</div></section>
        ${state.friends.length ? `<section class="col"><h3>בשם מי?</h3>${friendPicker(f.to, 'data-to')}</section>` : ''}
        <article class="card col" style="gap:6px;box-shadow:none"><span class="micro muted"><b>ככה ${t ? esc(t.display_name) : 'החבר'} ${G(t && t.pronoun, 'תקבל', 'יקבל', 'יקבלו')} את זה</b></span>
          <span class="display" style="font-size:16px;font-weight:700;line-height:1.35">״${esc((state.me || {}).display_name || '')} ${me('תרמה', 'תרם', 'תרמו')} ל[עמותה] ${f.occ === 'סתם כי' ? 'בשמך' : f.occ}. ${me('חושבת', 'חושב', 'חושבים')} עליך.״</span>
          <span class="micro muted">בלי צלילים, בלי קונפטי, בלי סכום</span></article>
        <div class="stack-bottom"><button class="btn dark" data-want>אני רוצה שזה יהיה פה</button>
          <span class="micro muted center">אנחנו בוחרים עכשיו את העמותות. ככה נדע כמה זה חשוב לכם.</span></div>`, { theme: 'lav' });
      wireBack('good');
      on('[data-o]', 'click', (e) => { f.occ = e.currentTarget.dataset.o; draw(); });
      on('[data-to]', 'click', (e) => { f.to = e.currentTarget.dataset.to; draw(); });
      on('[data-want]', 'click', (e) => { api.log('donate_interest', { occasion: f.occ }); e.currentTarget.disabled = true; e.currentTarget.textContent = 'רשמנו. תודה שאכפת לך'; });
    };
    draw();
  }

  // ───────────── KARMA. for Work (interest) ─────────────
  function screenWork() {
    api.log('work_viewed');
    const f = { holidays: ['ראש השנה'] };
    render(`
      <header class="top"><span class="display ltr" style="font-size:13px;padding:5px 10px;border-radius:10px;background:var(--ink);color:var(--cream)">KARMA. for Work</span>
        <button class="icon-btn" data-back aria-label="חזרה">${ICON.back}</button></header>
      <section class="card hero lime"><span class="display" style="font-size:28px;line-height:1.05">שי לחג שהעובדים<br>באמת ישמחו בו</span>
        <span class="small">כל עובד מקבל הודעה אישית מהמנהל ומהצוות, ובוחר לבד את המתנה.</span></section>
      <div class="col small" style="gap:6px"><span>· מתנות לראש השנה, פסח, סוף שנה וימי הולדת</span><span>· הצוות שולח תודות וקפה אחד לשני, והחברה משלמת</span><span>· בלי רשימות אקסל ובלי שוברים שנשכחים במגירה</span></div>
      <label class="field">שם החברה<input class="input" id="co" maxlength="60" placeholder="[שם החברה]"></label>
      <label class="field">כמה עובדים?<select class="input" id="size"><option>עד 20</option><option>20–100</option><option>100–500</option><option>500+</option></select></label>
      <section class="col"><h3>לאילו רגעים?</h3><div class="wrap">${['ראש השנה', 'פסח', 'סוף שנה', 'ימי הולדת', 'תודות שוטפות'].map((h) => `<button class="chip" data-h="${h}" aria-pressed="${f.holidays.includes(h)}">${h}</button>`).join('')}</div></section>
      <div class="stack-bottom"><button class="btn" id="go">דברו איתי</button><span class="micro muted center">נחזור ${me('אלייך', 'אליך', 'אליכם')} למייל שאיתו ${me('נכנסת', 'נכנסת', 'נכנסתם')}</span></div>`);
    on('[data-back]', 'click', () => back('profile'));
    on('[data-h]', 'click', (e) => { const h = e.currentTarget.dataset.h; f.holidays = f.holidays.includes(h) ? f.holidays.filter((x) => x !== h) : [...f.holidays, h]; e.currentTarget.setAttribute('aria-pressed', f.holidays.includes(h)); });
    on('#go', 'click', (e) => {
      api.log('work_lead', { company: $app.querySelector('#co').value.trim().slice(0, 60), size: $app.querySelector('#size').value, holidays: f.holidays });
      e.currentTarget.disabled = true; e.currentTarget.textContent = 'קיבלנו! נחזור אלייך בקרוב'; toast('תודה! נהיה בקשר');
    });
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
        case 'bets': return screenBets();
        case 'bet-new': return screenBetNew();
        case 'bet': return screenBet(arg);
        case 'good': return screenGood();
        case 'good-new': return screenGoodNew({ to: arg });
        case 'compliment': return screenGoodNew({ to: arg, compliment: true });
        case 'pass': return screenGoodNew({ passFrom: arg });
        case 'karma': return screenKarma(arg);
        case 'friend': return screenFriend(arg);
        case 'wishlist': return screenWishlist();
        case 'card-new': return screenCardNew();
        case 'card': return screenCard(arg);
        case 'donate': return screenDonate();
        case 'work': return screenWork();
        default: return go('');
      }
    } catch (e) {
      console.error(e);
      render(`<div class="loading col center"><h2>אופס.</h2><p class="muted">${esc(errText(e))}</p><button class="btn md" onclick="location.reload()">לנסות שוב</button></div>`);
    }
  }

  // Refresh home when data changes (demo replies) or the app comes back to the foreground.
  const refreshable = () => ['', 'onme', 'mine', 'bets', 'bet', 'good', 'card'].includes(location.hash.replace(/^#\/?/, '').split('/')[0]);
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
