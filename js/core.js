// KARMA. prototype — shared core: helpers, rendering, navigation, router.
// Every screen file registers itself with K.route('name', fn).
(function () {
  const K = (window.K = {});
  K.routes = {};
  K.route = (name, fn) => { K.routes[name] = fn; };
  K.state = { navCount: 0 };
  const $app = () => document.getElementById('app');

  // ───────── small helpers ─────────
  K.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  K.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  // Hebrew form for a FRIEND (we know their pronoun). The user is addressed in neutral wording.
  K.G = (p, f, m, pl) => (p === 'm' ? m : p === 'pl' ? (pl || m) : f);
  K.money = (n) => `₪${Number(n).toLocaleString('he-IL')}`;
  K.timeAgo = (iso) => {
    const s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (s < 0) return K.whenFuture(iso);
    if (s < 60) return 'עכשיו';
    const m = Math.floor(s / 60); if (m < 60) return m === 1 ? 'לפני דקה' : `לפני ${m} דקות`;
    const h = Math.floor(m / 60); if (h < 24) return h === 1 ? 'לפני שעה' : h === 2 ? 'לפני שעתיים' : `לפני ${h} שעות`;
    const d = Math.floor(h / 24); if (d === 1) return 'אתמול'; if (d === 2) return 'לפני יומיים';
    if (d < 7) return `לפני ${d} ימים`;
    const w = Math.floor(d / 7); if (w < 5) return w === 1 ? 'לפני שבוע' : `לפני ${w} שבועות`;
    return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  };
  K.whenFuture = (iso) => {
    const d = new Date(iso); const days = Math.round((d - new Date()) / 864e5);
    const hm = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    if (days <= 0) return `היום ב-${hm}`; if (days === 1) return `מחר ב-${hm}`;
    return `${d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })} ב-${hm}`;
  };
  K.dateShort = (iso) => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
  K.MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  K.bdayText = (b) => { if (!b) return ''; const [m, d] = b.split('-').map(Number); return `${d} ב${K.MONTHS[m - 1]}`; };
  K.daysToBirthday = (b) => {
    if (!b) return null;
    const [m, d] = b.split('-').map(Number); const now = new Date(); now.setHours(0, 0, 0, 0);
    let t = new Date(now.getFullYear(), m - 1, d); if (t < now) t = new Date(now.getFullYear() + 1, m - 1, d);
    return Math.round((t - now) / 864e5);
  };
  K.nextBirthdayMidnight = (b) => {
    const [m, d] = b.split('-').map(Number); const now = new Date();
    let t = new Date(now.getFullYear(), m - 1, d, 0, 0, 0); if (t <= now) t = new Date(now.getFullYear() + 1, m - 1, d, 0, 0, 0);
    return t;
  };

  // Copy for the USER: neutral by default, gendered only if they chose את/אתה in the profile.
  K.U = (neutral, f, m) => { const p = K.api && K.api.me && K.api.me().pronoun; return p === 'f' ? (f != null ? f : neutral) : p === 'm' ? (m != null ? m : neutral) : neutral; };
  K.link = (param) => location.origin + location.pathname + (param ? '?i=' + encodeURIComponent(param) : '');
  K.shareWA = (text) => { K.api.log('invite_shared', {}); window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); };
  K.inviteText = (kind) => {
    const me = K.api.me().name;
    if (kind === 'beef') return `You've been KARMAd 😈\nל${me} יש ביף איתך. מה עשית? נכנסים לראות ›\n${K.link('beef')}`;
    if (kind === 'karma') return `You've been KARMAd 😇\nל${me} יש משהו טוב בשבילך. נכנסים לראות ›\n${K.link('karma')}`;
    return `הזמנה מ${me} ל-KARMA. 😈😇\nביפים, גוד קארמה ומתנות אמיתיות בין חברים ›\n${K.link('plain')}`;
  };
  // Simulated "Continue with Apple".
  K.apple = async () => {
    const v = await K.sheetHTML(`<div class="row" style="gap:8px">${K.ICON.apple}<b>כניסה עם Apple ID</b></div>
      <button class="opt" data-v="ok"><span class="av pink">א</span><span style="flex:1"><span class="t">אור</span><br><span class="s">אפשר להסתיר את המייל</span></span></button>
      <p class="micro muted" style="margin:0">בהדגמה אין כניסה אמיתית.</p>
      <button class="btn ghost" data-v="">ביטול</button>`, 'כניסה עם Apple');
    if (v !== 'ok') return false;
    await K.api.signIn(); await K.api.updateMe({ provider: 'Apple' }); return true;
  };
  // Pick a provider (used right before paying on the QR page).
  K.login = async () => {
    const v = await K.sheetHTML(`<h2>רגע לפני התשלום</h2>
      <button class="btn login dark" data-v="apple">${K.ICON.apple}<span>המשך עם Apple</span></button>
      <button class="btn login white" data-v="google">${K.ICON.google}<span>המשך עם Google</span></button>`, 'כניסה');
    if (v === 'apple') return K.apple();
    if (v === 'google') return K.google();
    return false;
  };
  // Simulated "Continue with Google" (the real one comes with the server).
  K.google = async () => {
    const v = await K.sheetHTML(`<div class="row" style="gap:8px">${K.ICON.google}<b>בחירת חשבון</b></div>
      <p class="muted small" style="margin:0">להמשך אל KARMA.</p>
      <button class="opt" data-v="ok"><span class="av pink">א</span><span style="flex:1"><span class="t">אור</span><br><span class="s ltr">or@gmail.com</span></span></button>
      <p class="micro muted" style="margin:0">בהדגמה אין כניסה אמיתית. Google תשתף רק שם, תמונה ומייל.</p>
      <button class="btn ghost" data-v="">ביטול</button>`, 'כניסה עם Google');
    if (v !== 'ok') return false;
    await K.api.signIn(); await K.api.updateMe({ provider: 'Google' }); return true;
  };

  // ───────── visual atoms ─────────
  K.av = (p, cls) => {
    if (!p) return `<span class="av anon ${cls || ''}" aria-hidden="true">?</span>`;
    return `<span class="av ${K.esc(p.color || 'surface')} ${cls || ''}" aria-hidden="true">${K.esc((p.name || '?').trim().charAt(0))}</span>`;
  };
  K.chilis = (n) => `<span class="chilis" role="img" aria-label="חריפות ${n} מתוך 3">${'🌶'.repeat(n)}</span>`;
  K.logo = (cls) => `<span class="logo ${cls || ''}">KARMA<i>.</i></span>`;
  K.ICON = {
    close: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    back: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    fwd: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    share: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    plus: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B1116" stroke-width="3" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    user: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    bell: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    home: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
    accounts: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h14v16l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 9h6M9 13h4"/></svg>',
    heart: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 20.5s-7.5-4.6-9.6-9.3C.9 7.8 3 4 6.6 4c2.1 0 3.6 1.2 5.4 3.2C13.8 5.2 15.3 4 17.4 4 21 4 23.1 7.8 21.6 11.2 19.5 15.9 12 20.5 12 20.5z"/></svg>',
    gift: '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18M12 8v13"/><path d="M12 8c-1.5-3-5.5-4-5.5-1.5S10 8 12 8zM12 8c1.5-3 5.5-4 5.5-1.5S14 8 12 8z"/></svg>',
    google: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
    apple: '<svg aria-hidden="true" width="18" height="20" viewBox="0 0 17 20" fill="currentColor"><path d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9C3.6 4.8 2 5.8 1 7.4c-1.9 3.3-.5 8.2 1.4 10.9.9 1.3 2 2.8 3.4 2.7 1.4-.1 1.9-.9 3.5-.9s2.1.9 3.5.9c1.5 0 2.4-1.3 3.3-2.6 1-1.5 1.4-3 1.5-3.1-.1 0-2.9-1.1-3-4.3zM11.5 3c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.2.1 2.3-.6 3-1.5z"/></svg>',
    wa: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="#1B1116"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l2 .9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>',
  };

  // ───────── feedback ─────────
  K.toast = (msg) => {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 3200);
  };
  // Bottom sheet with custom HTML. Buttons with data-v="value" resolve the promise with that value.
  K.sheetHTML = (html, label) => new Promise((resolve) => {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${K.esc(label || '')}"><button class="sheet-x" data-v="" aria-label="סגירה">${K.ICON.close}</button>${html}</div>`;
    const done = (v) => { bg.remove(); resolve(v); };
    bg.addEventListener('click', (e) => {
      if (e.target === bg) return done(null);
      const b = e.target.closest('[data-v]'); if (b) done(b.dataset.v);
    });
    document.body.appendChild(bg);
    const f = bg.querySelector('[data-v]'); if (f) f.focus();
  });
  K.confirm = (title, body, yes, no, danger) => K.sheetHTML(`<h2>${K.esc(title)}</h2>${body ? `<p class="muted" style="margin:0">${K.esc(body)}</p>` : ''}
    <button class="btn ${danger ? '' : 'lime'}" data-v="yes">${K.esc(yes)}</button><button class="btn ghost" data-v="no">${K.esc(no || 'ביטול')}</button>`, title).then((v) => v === 'yes');

  // Every sheet has an ✕; this closes the ones that don't route through sheetHTML.
  document.addEventListener('click', (e) => { const x = e.target.closest('.sheet-x[data-close]'); if (x) { const bg = x.closest('.sheet-bg'); if (bg) bg.remove(); } });

  // Simulated checkout (no payment provider yet).
  K.pay = (amount, label) => K.sheetHTML(`
    <div class="row between"><h2>תשלום</h2><span class="tag peach">הדגמה</span></div>
    <div class="card cream flat row between"><span>${K.esc(label)}</span><b class="display" style="font-size:22px">${K.money(amount)}</b></div>
    <button class="btn dark" data-v="pay" style="gap:6px">${K.ICON.apple}<span>Pay</span></button>
    <button class="btn md white" data-v="pay"> כרטיס אשראי</button>
    <p class="micro muted center" style="margin:0">בפרוטוטייפ לא נגבה כסף. הסליקה האמיתית תחובר בהמשך.</p>
    <button class="btn ghost" data-v="no">ביטול</button>`, 'תשלום').then((v) => v === 'pay');

  // ───────── navigation & rendering ─────────
  K.go = (path) => { location.hash = '#/' + path; };
  // Always a known screen: browser history is unreliable inside embedded previews.
  K.back = (fallback) => K.go(fallback || '');
  K.on = (sel, ev, fn) => $app().querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));

  K.bottomNav = (active) => {
    const it = (k, href, icon, label) => `<a class="bn-item" href="${href}" ${active === k ? 'aria-current="page"' : ''}>${K.ICON[icon]}<span>${label}</span></a>`;
    return `<nav class="bottomnav" aria-label="ניווט ראשי">
      ${it('home', '#/', 'home', 'בית')}
      <button class="bn-plus" data-plus aria-label="מה שולחים?">${K.ICON.plus}</button>
      ${it('wallet', '#/wallet', 'gift', 'המתנות שלי')}
</nav>`;
  };

  // opts: { nav, theme: 'dark'|'pink'|'hotpink'|'lime'|'lav', moment: { share: fn, close: path } }
  K.render = (html, opts) => {
    opts = opts || {};
    const b = document.body;
    b.className = '';
    if (opts.theme) b.classList.add('t-' + opts.theme);
    if (opts.nav) b.classList.add('has-nav');
    const demo = K.api && K.api.demo ? '<div class="demo-bar">פרוטוטייפ · הנתונים, העסקים והתשלומים לדוגמה</div>' : '';
    const top = opts.moment ? `<div class="moment-top">
        <button class="icon-btn" data-m-close aria-label="סגירה">${K.ICON.close}</button>
        ${opts.moment.share ? `<button class="icon-btn" data-m-share aria-label="לשתף">${K.ICON.share}</button>` : '<span></span>'}
</div>` : '';
    $app().innerHTML = demo + `<main class="screen">${top}${html}</main>` + (opts.nav ? K.bottomNav(opts.nav) : '');
    window.scrollTo(0, 0);
    if (opts.moment) {
      K.on('[data-m-close]', 'click', () => K.go(opts.moment.close || ''));
      if (opts.moment.share) K.on('[data-m-share]', 'click', opts.moment.share);
    }
  };
  K.loading = () => K.render('<div class="loading"><div class="spin" aria-label="טוען"></div></div>');
  K.header = (title, opts) => `<header class="top"><h1>${title}</h1>
    <button class="icon-btn" data-back aria-label="${opts && opts.close ? 'סגירה' : 'חזרה'}">${opts && opts.close ? K.ICON.close : K.ICON.back}</button></header>`;
  K.wireBack = (fallback) => K.on('[data-back]', 'click', () => K.back(fallback));
  K.homeHeader = () => `<header class="top">${K.logo()}
      <div class="row" style="gap:8px">
        <a class="icon-btn" href="#/inbox" aria-label="התראות">${K.ICON.bell}<span class="dot" data-bell-dot ${K.state.unread ? '' : 'hidden'}>${K.state.unread > 9 ? '9+' : K.state.unread || ''}</span></a>
        <a class="icon-btn" href="#/profile" aria-label="פרופיל">${K.ICON.user}</a>
</div></header>`;

  // The "what are we sending?" sheet behind the + button.
  document.addEventListener('click', async (e) => {
    if (!e.target.closest('[data-plus]')) return;
    const v = await K.sheetHTML(`<h2>מה שולחים?</h2>
      <div class="col" style="gap:8px">
        <button class="opt" data-v="new-beef" style="background:#FFEDE6"><span class="em">😈</span><span style="flex:1"><span class="t">ביף</span><br><span class="s">מישהו חייב לך משהו קטן? איחר, שכח, אכל לך את הצ׳יפס</span></span></button>
        <button class="opt" data-v="new-karma" style="background:var(--pink-soft)"><span class="em">😇</span><span style="flex:1"><span class="t">גוד קארמה</span><br><span class="s" style="color:var(--ink)">בא לך לפרגן? תודה, מזל טוב, סתם כי התגעגעת</span></span></button>
        ${K.api.BETS ? '' : '<!--'}<button class="opt" data-v="new-bet" style="background:var(--lime)"><span class="em"></span><span style="flex:1"><span class="t">התערבות</span><br><span class="s" style="color:var(--ink)">על הכבוד, או על קפה</span></span></button>${K.api.BETS ? '' : '-->'}
</div><button class="btn ghost" data-v="">ביטול</button>`, 'מה שולחים?');
    if (v) { K.api.log('create_sheet', { pick: v }); K.go(v); }
  });

  K.refreshUnread = async () => {
    try { K.state.unread = await K.api.unread(); } catch (e) { K.state.unread = 0; }
    document.querySelectorAll('[data-bell-dot]').forEach((d) => { d.hidden = !K.state.unread; d.textContent = K.state.unread > 9 ? '9+' : K.state.unread; });
  };

  // ───────── router ─────────
  const PUBLIC = ['welcome', 'privacy', 'terms', 'c', 'biz', 'admin'];
  async function route() {
    K.state.navCount++;
    const full = location.hash.replace(/^#\/?/, '');
    const [path, qs] = full.split('?');
    K.q = new URLSearchParams(qs || '');
    const [name, ...args] = path.split('/');
    try {
      if (!K.api.signedIn() && !PUBLIC.includes(name)) return K.routes.welcome();
      const fn = K.routes[name || 'home'];
      if (!fn) return K.go('');
      K.api.log('screen_view', { screen: name || 'home' });
      if (['', 'home', 'accounts', 'good', 'wallet'].includes(name)) K.refreshUnread();
      await fn(...args);
    } catch (e) {
      console.error(e);
      K.render(`<div class="loading col center"><h2>אופס.</h2><p class="muted">${K.esc(K.errText(e))}</p><button class="btn md" onclick="location.reload()">לנסות שוב</button></div>`);
    }
  }
  K.routeNow = route;
  K.errText = (e) => {
    const m = (e && e.message) || '';
    const mod = m.match(/moderation:(\w+)/);
    if (mod) return K.MOD_MSG[mod[1]] || K.MOD_MSG.sexual;
    if (m.includes('bad_pin')) return 'הקוד לא נכון. כדאי לבדוק עם הצוות.';
    if (m.includes('redeemed')) return 'המתנה הזו כבר מומשה.';
    if (m.includes('paused')) return 'העסק סגור זמנית. המתנה תחכה.';
    if (m.includes('too_many_open')) return 'כבר יש 3 ביפים פתוחים עם החבר הזה. קודם לסגור משהו.';
    if (m.includes('Failed to fetch')) return 'אין חיבור. בודקים את האינטרנט ומנסים שוב.';
    return 'משהו השתבש. מנסים שוב?';
  };
  K.MOD_MSG = {
    violence: 'זה נשמע כמו איום, גם אם בצחוק. ב-KARMA. סוגרים חשבון בקפה, לא במכות.',
    ostracism: 'זה נשמע כמו להוציא מישהו מהחבורה. פה סוגרים חשבונות, לא מחרימים.',
    hate: 'יש פה מילה שפוגעת במי שהאדם הוא. את זה לא שולחים.',
    sexual: 'בלי קללות ובלי מיניות. אפשר לנסח את זה מצחיק יותר.',
    body: 'בלי הערות על איך מישהו נראה. זה אף פעם לא באמת מצחיק.',
  };
  K.modWarn = ($el, text) => {
    const cat = window.KarmaModeration ? window.KarmaModeration.check(text) : null;
    if ($el) { $el.hidden = !cat; $el.textContent = cat ? K.MOD_MSG[cat] : ''; }
    return cat;
  };

  window.addEventListener('hashchange', route);
  window.addEventListener('karma:changed', () => {
    const name = location.hash.replace(/^#\/?/, '').split(/[/?]/)[0];
    if (['', 'home', 'accounts', 'good', 'wallet', 'inbox', 'beef', 'mine', 'bet'].includes(name) && !document.querySelector('.sheet-bg')) route();
    else K.refreshUnread();
  });

  K.boot = async () => {
    K.render('<div class="loading"><div class="spin" aria-label="טוען"></div></div>');
    await K.api.init();
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
    const p = new URLSearchParams(location.search);
    if (p.get('i')) { K.store.set('karma_invite', p.get('i')); history.replaceState(null, '', location.pathname + location.hash); }
    route();
  };
})();
