// Profile, friends, friend balance, notifications, Wrapped.
(function () {
  const esc = K.esc;
  const A = () => K.api;

  K.route('profile', () => {
    const me = A().me(), t = A().myTotals(), fs = A().friends();
    const L = me.likes || {};
    K.render(`
      ${K.header('פרופיל')}
      <div class="col center" style="gap:6px">${K.av(me, 'xl')}<h1>${esc(me.name)}</h1><span class="micro muted"><span class="ltr">${esc(me.email)}</span> · מחובר עם Google</span></div>
      <div class="stat-line" style="justify-content:center"><span class="pill pink">😇 ${t.goodGot + t.goodSent}</span><span class="pill peach">😈 ${t.beefs}</span><span class="pill lime">🥊 <span class="ltr">${t.betsWon}–${t.betsLost}</span></span></div>
      <a class="card row" href="#/wrapped" style="text-decoration:none;background:var(--ink);color:var(--cream)"><span style="font-size:26px">✨</span><b style="flex:1" class="ltr">Your month in KARMA.</b>${K.ICON.fwd}</a>

      <section class="col"><div class="sec"><h2>חברים (${fs.length})</h2><a class="small" href="#/friends">לכולם ›</a></div>
        <div class="friends-row">${fs.map((f) => `<a class="friend-pick" href="#/friend/${f.id}" style="text-decoration:none;color:inherit">${K.av(f, 'lg')}<span>${esc(f.name)}</span></a>`).join('')}</div>
        <button class="btn md white" id="inv">${K.ICON.wa}<span>להזמין חברים</span></button></section>

      <section class="col"><h2>יום ההולדת שלי 🎂</h2>
        <div class="row"><select class="input" id="bd-d" aria-label="יום"><option value="">יום</option>${Array.from({ length: 31 }, (_, i) => `<option ${me.birthday && +me.birthday.split('-')[1] === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select>
        <select class="input" id="bd-m" aria-label="חודש"><option value="">חודש</option>${K.MONTHS.map((m, i) => `<option value="${i + 1}" ${me.birthday && +me.birthday.split('-')[0] === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <p class="micro muted" style="margin:0">חברים יקבלו תזכורת כמה ימים לפני. בלי שנה.</p></section>

      <section class="col"><h2>מה משמח אותי</h2><p class="micro muted" style="margin:0">חברים רואים את זה כשהם שולחים לך מתנה.</p>
        <label class="field">☕ הקפה שלי<input class="input" data-like="coffee" value="${esc(L.coffee || '')}" placeholder="הפוך על שיבולת" maxlength="30"></label>
        <label class="field">🍦 מתוק אהוב<input class="input" data-like="sweet" value="${esc(L.sweet || '')}" placeholder="גלידה פיסטוק" maxlength="30"></label>
        <label class="field">📍 מקום אהוב<input class="input" data-like="place" value="${esc(L.place || '')}" placeholder="קפה לוטוס" maxlength="30"></label></section>

      <section class="col"><h2>איך לפנות אליך?</h2>
        <div class="seg"><button data-pr="" aria-pressed="${!me.pronoun}">בלי מגדר</button><button data-pr="f" aria-pressed="${me.pronoun === 'f'}">את</button><button data-pr="m" aria-pressed="${me.pronoun === 'm'}">אתה</button></div></section>

      <section class="col"><h2>התראות</h2>
        <div class="list">
          <div><span class="grow"><b>מיד</b><br><span class="micro muted">ביף, גוד קארמה והתערבות חדשה</span></span><span class="pill lime">תמיד</span></div>
          <div><span class="grow"><b>כל השאר בסיכום יומי</b><br><span class="micro muted">הצעות, תודות, תזכורות</span></span>
            <select class="input" id="digest" style="width:auto;height:40px">${[['18:00', '18:00'], ['20:00', '20:00'], ['now', 'הכול מיד']].map(([v, t]) => `<option value="${v}" ${me.notif.digest === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
          <div><span class="grow"><b>שקט בלילה</b><br><span class="micro muted">23:00–08:00 · חוץ מגוד קארמה של יום הולדת</span></span><button class="toggle" role="switch" id="quiet" aria-checked="${me.notif.quiet}" aria-label="שקט בלילה"></button></div>
        </div></section>

      <section class="col"><h2>הדגמה: צד העסק</h2>
        <div class="list">
          <a href="#/c/lotus"><span>📱</span><span class="grow">סריקת QR בבית הקפה</span>${K.ICON.fwd}</a>
          <a href="#/biz"><span>☕</span><span class="grow">הלוח של בעל העסק</span>${K.ICON.fwd}</a>
          <a href="#/admin"><span>🧰</span><span class="grow">כלי צירוף עסקים (שלך)</span>${K.ICON.fwd}</a>
        </div></section>

      <div class="list">
        <a href="#/privacy"><span class="grow">מדיניות פרטיות</span>${K.ICON.fwd}</a>
        <a href="#/terms"><span class="grow">תנאי שימוש</span>${K.ICON.fwd}</a>
        <button id="out"><span class="grow">התנתקות</span></button>
        <button id="reset"><span class="grow">איפוס ההדגמה</span></button>
        <button id="del" style="color:#B3261E"><span class="grow"><b>מחיקת החשבון</b></span></button>
      </div>`);
    K.wireBack('');
    K.on('#inv', 'click', () => K.shareWA(K.inviteText('plain')));
    const saveBd = () => { const d = document.getElementById('bd-d').value, m = document.getElementById('bd-m').value; if (d && m) { A().updateMe({ birthday: `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }); K.toast('נשמר 🎂'); } };
    K.on('#bd-d', 'change', saveBd); K.on('#bd-m', 'change', saveBd);
    K.on('[data-like]', 'change', (e) => {
      if (K.modWarn(null, e.target.value)) return K.toast('את זה לא נשמור 🙃');
      A().updateMe({ likes: Object.assign({}, A().me().likes, { [e.target.dataset.like]: e.target.value.trim() }) }); K.toast('נשמר');
    });
    K.on('[data-pr]', 'click', async (e) => { await A().updateMe({ pronoun: e.currentTarget.dataset.pr || null }); K.routeNow(); });
    K.on('#digest', 'change', (e) => { A().updateMe({ notif: Object.assign({}, A().me().notif, { digest: e.target.value }) }); K.toast('נשמר'); });
    K.on('#quiet', 'click', (e) => { const v = e.currentTarget.getAttribute('aria-checked') !== 'true'; e.currentTarget.setAttribute('aria-checked', v); A().updateMe({ notif: Object.assign({}, A().me().notif, { quiet: v }) }); });
    K.on('#out', 'click', async () => { await A().signOut(); K.go('welcome'); });
    K.on('#reset', 'click', async () => { if (await K.confirm('לאפס את ההדגמה?', 'הכול חוזר להתחלה, כולל הכניסה.', 'לאפס')) { await A().reset(); K.go('welcome'); } });
    K.on('#del', 'click', async () => { if (await K.confirm('למחוק את החשבון?', 'הכול נמחק: ביפים, גוד קארמה, התערבויות וחברים. מתנות שלא מומשו יאבדו.', 'למחוק לתמיד', 'ביטול', true)) { await A().deleteAccount(); K.go('welcome'); } });
  });

  K.route('friends', () => {
    const fs = A().friends();
    K.render(`
      ${K.header('חברים')}
      <button class="btn md white" id="inv">${K.ICON.wa}<span>להזמין חברים</span></button>
      <div class="col">${fs.map((f) => { const b = A().balanceWith(f.id); return `<a class="beef" href="#/friend/${f.id}">${K.av(f)}<span class="body"><span class="reason">${esc(f.name)}${f.invited ? ' · ⏳ הוזמן' : ''}</span><span class="meta">😇 ${b.good} · 😈 ${b.bets ? b.bad : 0} · 🥊 <span class="ltr">${b.bets.won}–${b.bets.lost}</span></span></span>${K.ICON.fwd}</a>`; }).join('')}</div>`);
    K.wireBack('profile');
    K.on('#inv', 'click', () => K.shareWA(K.inviteText('plain')));
  });

  K.route('friend', (id) => {
    const f = A().friend(id); if (!f) return K.go('friends');
    const b = A().balanceWith(id), me = A().me();
    const tot = Math.max(b.good + b.bad, 1);
    const L = f.likes || {};
    const likes = [['☕', L.coffee], ['🍦', L.sweet], ['📍', L.place]].filter((x) => x[1]);
    const hrow = (h) => {
      if (h.type === 'beef') { const x = h.item; return `<a href="#/${['settled', 'released', 'cooled'].includes(x.status) ? 'closed' : x.from === 'me' ? 'mine' : 'beef'}/${x.id}"><span>😈</span><span class="grow">${esc(x.reason)}<br><span class="micro muted">${x.from === 'me' ? 'פתחת' : esc(f.name)} · ${K.timeAgo(h.at)}</span></span>${K.statusPill(x)}</a>`; }
      if (h.type === 'karma') { const x = h.item; return `<a href="#/karma/${x.id}"><span>😇</span><span class="grow">${x.occ.name} ${x.occ.emoji}<br><span class="micro muted">${x.from === 'me' ? 'שלחת' : esc(f.name)} · ${K.timeAgo(h.at)}</span></span>${x.gift ? x.gift.product.emoji : ''}</a>`; }
      const x = h.item; return `<a href="#/bet/${x.id}"><span>🥊</span><span class="grow">${esc(x.topic)}<br><span class="micro muted">${K.timeAgo(h.at)}</span></span>${K.betPill(x)}</a>`;
    };
    K.render(`
      ${K.header('')}
      <div class="col center" style="gap:8px"><div class="pair">${K.av(me, 'xl')}${K.av(f, 'xl')}</div><h1>${esc(me.name)} & ${esc(f.name)}</h1></div>
      <div class="card col">
        <div class="row between"><b>😇 ${b.good} גוד קארמה</b><b>😈 ${b.bad} ביפים</b></div>
        <div class="bar" aria-hidden="true"><span class="g" style="width:${(b.good / tot) * 100}%"></span><span class="b" style="width:${(b.bad / tot) * 100}%"></span></div>
        <div class="row between micro"><span>שלחת 😇${b.mine.good} · 😈${b.mine.bad}</span><span>${esc(f.name)} 😇${b.theirs.good} · 😈${b.theirs.bad}</span></div>
        <div class="row between"><span class="small">התערבויות</span><b class="ltr">${b.bets.won}–${b.bets.lost} 🏆</b></div>
      </div>
      ${f.birthday || likes.length ? `<div class="card lav col">${f.birthday ? `<div>🎂 <b>${K.bdayText(f.birthday)}</b> · ${(() => { const d = K.daysToBirthday(f.birthday); return d === 0 ? 'היום!' : `עוד ${d} ימים`; })()}</div>` : ''}
        ${likes.length ? `<div class="small"><b>מה משמח את ${esc(f.name)}:</b> ${likes.map((x) => `${x[0]} ${esc(x[1])}`).join(' · ')}</div>` : ''}</div>` : ''}
      <div class="grid3">
        <a class="btn md pink" href="#/new-karma?to=${id}">😇</a><a class="btn md" href="#/new-beef?to=${id}">😈</a><a class="btn md lime" href="#/new-bet?to=${id}">🥊</a>
      </div>
      <section class="col"><h2>היסטוריה</h2><div class="list">${b.history.map(hrow).join('') || '<div class="muted">עוד ריק. מישהו צריך להתחיל 😈</div>'}</div></section>
      <button class="btn md white" id="share">⤴ לשתף את המאזן</button>`);
    K.wireBack('friends');
    K.on('#share', 'click', () => K.shareStory({ bg: 'pinkSoft', kicker: 'KARMA BALANCE', title: `${me.name} & ${f.name}`, card: { lines: [`😇 ${b.good}   ·   😈 ${b.bad}`, `🥊 ${b.bets.won}–${b.bets.lost}`] } }, 'balance'));
  });

  K.route('inbox', async () => {
    const ns = A().notifications();
    const row = (n) => `<a href="#/${n.link}"><span class="grow"><b>${/[A-Za-z]/.test(n.title) ? `<span class="ltr">${esc(n.title)}</span>` : esc(n.title)}</b><br><span class="small">${esc(n.body)}</span><br><span class="micro muted">${K.timeAgo(n.createdAt)}</span></span></a>`;
    const fresh = ns.filter((n) => !n.read), old = ns.filter((n) => n.read);
    const d = A().me().notif.digest;
    K.render(`
      ${K.header('התראות')}
      <p class="micro muted" style="margin:0">ביף, גוד קארמה והתערבות חדשה מגיעים מיד. ${d === 'now' ? 'גם כל השאר מגיע מיד.' : `כל השאר בסיכום יומי ב-${d}.`} <a href="#/profile">לשנות</a></p>
      ${fresh.length ? `<section class="col"><h2>חדש</h2><div class="list">${fresh.map(row).join('')}</div></section>` : ''}
      ${old.length ? `<section class="col"><h2>קודם</h2><div class="list">${old.map(row).join('')}</div></section>` : ''}
      ${!ns.length ? '<p class="muted center">שקט פה. בינתיים 😇</p>' : ''}`);
    K.wireBack('');
    await A().markRead(); K.state.unread = 0;
  });

  // ───────── Wrapped (English, story style) ─────────
  const PERSONA = {
    angel: ['😇', 'The Angel', 'נותנים יותר משמקבלים.'],
    closer: ['🤝', 'The Closer', 'אף ביף לא שורד לידך.'],
    oracle: ['🔮', 'The Oracle', 'יודעים מי ינצח לפני כולם.'],
    beefmaster: ['😈', 'The Beef Master', 'אף אחד לא בורח לך.'],
    quiet: ['🤫', 'Suspiciously Quiet', 'חודש שקט. חשוד.'],
  };
  K.route('wrapped', () => {
    const w = A().wrapped();
    const month = new Date(); month.setMonth(month.getMonth() - 1);
    const mName = month.toLocaleString('en', { month: 'long' });
    const fast = w.fastest ? (w.fastest < 36e5 ? `${Math.max(1, Math.round(w.fastest / 6e4))} דקות` : w.fastest < 2 * 36e5 ? 'שעה' : w.fastest < 3 * 36e5 ? 'שעתיים' : `${Math.round(w.fastest / 36e5)} שעות`) : null;
    const per = PERSONA[w.persona];
    const slides = [
      `<div class="en" style="font-size:44px;line-height:1">Your ${mName}<br>in KARMA<span style="color:var(--pink)">.</span></div><p>החודש שלך, בשישה רגעים.</p>`,
      `<div class="en" style="font-size:90px">${w.closed} 😈</div><div class="en" style="font-size:26px">closed</div>${fast ? `<p>הביף הכי מהיר נסגר תוך ${fast} ⚡</p>` : ''}`,
      `<div class="en" style="font-size:90px">${w.goodSent} 😇</div><div class="en" style="font-size:26px">given</div><p>וקיבלת ${w.goodGot}</p>`,
      `<div class="en" style="font-size:90px">🥊 ${w.won}–${w.lost}</div><div class="en" style="font-size:26px">${w.lost === 0 ? 'Undefeated.' : 'Undefeated? Almost.'}</div>`,
      w.best ? `<div class="en" style="font-size:24px">Best friend of the month</div><div class="row" style="justify-content:center">${K.av(w.best, 'xl')}</div><h1>${esc(w.best.name)}</h1><div class="en" style="font-size:28px">😇${w.bestBal.good} · 😈${w.bestBal.bad}</div>` : `<div class="en" style="font-size:28px">Best friend of the month</div><p>עוד אין. אולי בחודש הבא?</p>`,
      `<div class="en" style="font-size:22px">This month you were…</div><div style="font-size:90px">${per[0]}</div><div class="en" style="font-size:40px">${per[1]}</div><p>${per[2]}</p>
       <label class="row" style="justify-content:center;font-size:13px"><input type="checkbox" id="hide"> להסתיר את השם של ${w.best ? esc(w.best.name) : 'החבר'} בתמונה</label>
       <button class="btn pink" id="share">לשתף ⤴</button>`,
    ];
    let i = 0;
    const draw = () => {
      document.querySelectorAll('.wrapped').forEach((x) => x.remove());
      const el = document.createElement('div'); el.className = 'wrapped'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Karma Wrapped');
      el.innerHTML = `<div class="bars">${slides.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>
        <div class="wtop"><button class="icon-btn" id="wx" aria-label="סגירה">${K.ICON.close}</button>${K.logo()}</div>
        ${i < slides.length - 1 ? '<div class="tap"><button id="nx" aria-label="הבא"></button><button id="pv" aria-label="הקודם"></button></div>' : ''}
        <div class="slide">${slides[i]}</div>`;
      document.body.appendChild(el);
      el.querySelector('#wx').onclick = () => { el.remove(); K.go('profile'); };
      const nx = el.querySelector('#nx'), pv = el.querySelector('#pv');
      if (nx) nx.onclick = () => { i++; draw(); };
      if (pv) pv.onclick = () => { if (i > 0) { i--; draw(); } };
      const sh = el.querySelector('#share');
      if (sh) sh.onclick = () => {
        const hide = el.querySelector('#hide').checked;
        K.shareStory({ bg: 'ink', kicker: `MY ${mName.toUpperCase()} IN KARMA.`, big: per[0], card: { lines: [per[1], `😈 ${w.closed} closed · 😇 ${w.goodSent} given · 🥊 ${w.won}–${w.lost}`, w.best ? `BFF: ${hide ? '🤫' : w.best.name}` : ''].filter(Boolean), fill: 'pink' } }, 'wrapped');
      };
    };
    K.render('', {});
    draw();
    window.addEventListener('hashchange', () => document.querySelectorAll('.wrapped').forEach((x) => x.remove()), { once: true });
  });
})();
