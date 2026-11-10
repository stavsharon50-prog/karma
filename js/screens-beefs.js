// Home, beefs (on me / mine / settle / closed / new) and the חשבונות tab.
(function () {
  const esc = K.esc;
  const A = () => K.api;
  const GEST = () => K.api.GESTURES;

  // ───────── home ─────────
  K.route('home', () => {
    if (!A().onboarded()) { const inv = A().invite(); return K.go(inv && inv.approved ? 'intro' : 'intro'); }
    const h = A().home();
    const me = A().me();
    const inv = A().invite();
    const cards = h.waiting.map(waitCard).join('');
    const nothing = !h.waiting.length && !h.mine.length;
    const tip = !A().tipSeen() ? `<div class="note row between"><span>💡 הכפתור <b>➕</b> פותח ביף, גוד קארמה או התערבות.</span><button class="link micro" id="tip">הבנתי</button></div>` : '';
    const plainSuggest = inv && inv.kind === 'plain' && inv.approved && !A().beefs().mine.some((b) => b.to === inv.from)
      ? `<a class="card peach row" href="#/new-beef?to=${inv.from}" style="text-decoration:none"><span style="font-size:28px">😈</span><b style="flex:1">לפתוח ביף ראשון על ${esc(inv.fromP.name)}?</b>${K.ICON.fwd}</a>` : '';
    const rem = h.reminder;
    const reminder = !rem ? '' : rem.type === 'bday'
      ? `<a class="card lav row" href="#/new-karma?to=${rem.friend.id}&occ=bday" style="text-decoration:none"><span style="font-size:28px">🎂</span><span style="flex:1"><b>ל${esc(rem.friend.name)} יום הולדת ${rem.days === 0 ? 'היום!' : rem.days === 1 ? 'מחר' : `בעוד ${rem.days} ימים`}</b><br><span class="small">לשלוח גוד קארמה שתגיע בחצות?</span></span>${K.ICON.fwd}</a>`
      : `<a class="card lav row" href="#/redeem/${rem.gift.id}" style="text-decoration:none"><span style="font-size:28px">${rem.gift.product.emoji}</span><span style="flex:1"><b>ה${esc(rem.gift.product.name)} מחכה לך</b><br><span class="small">${esc(rem.gift.product.biz.name)} · ${K.validity(rem.gift)}</span></span>${K.ICON.fwd}</a>`;
    K.render(`
      ${K.homeHeader()}
      <div class="col" style="gap:8px">
        <h1>היי ${esc(me.name)} 👋</h1>
        <div class="stat-line"><span class="pill">השבוע:</span><span class="pill peach">😈 ${h.week.beefs} ביפים</span><span class="pill pink">😇 ${h.week.good} גוד קארמה</span>${h.week.gifts ? `<a class="pill lime" href="#/wallet" style="text-decoration:none">🎁 ${h.week.gifts} למימוש</a>` : ''}</div>
      </div>
      ${tip}${plainSuggest}
      ${nothing ? `<div class="card cream center col" style="padding:28px 18px"><div style="font-size:44px">😈</div><h2>עוד אין כאן אף אחד</h2><p class="muted" style="margin:0">ביף אחד בוואטסאפ, וזה מתחיל.</p><button class="btn md" id="inv">להזמין חבר</button></div>` : ''}
      ${h.waiting.length ? `<section class="col"><div class="sec"><h2>מחכה לך</h2><span class="pill dark">${h.waiting.length}</span></div>${cards}</section>`
        : !nothing ? `<div class="card lime row"><span style="font-size:28px">✨</span><div><b>הכול סגור. קארמה נקייה.</b><br><span class="small">אין שום דבר שמחכה לך.</span></div></div>` : ''}
      ${reminder}
      ${h.mine.length ? `<section class="col"><div class="sec"><h2>הביפים שלי</h2><a class="small" href="#/accounts">לכל הביפים ›</a></div>
        ${h.mine.slice(0, 3).map((b) => K.beefRow(b, { cool: true })).join('')}</section>` : ''}
    `, { nav: 'home' });
    K.on('#tip', 'click', () => { A().setTipSeen(); K.routeNow(); });
    K.on('#inv', 'click', () => K.shareWA(K.inviteText('plain')));
    wireWaiting();
  });

  function waitCard(w) {
    const x = w.item, f = x.friend;
    const head = (k, line, right) => `<div class="head">${K.av(f)}<div class="body">${k ? `<div class="k">${k}</div>` : ''}<b>${line}</b><div class="micro muted">${K.timeAgo(w.at || x.createdAt)}</div></div>${right || ''}</div>`;
    switch (w.type) {
      case 'beef': return `<div class="card peach wcard">
        <a href="#/beef/${x.id}" style="text-decoration:none;color:inherit">${head("You've been KARMAd 😈", `${esc(f.name)}: ${esc(x.reason)}`, K.chilis(x.spice))}</a>
        <div class="acts"><a class="btn md" href="#/settle/${x.id}">לסגור חשבון</a><a class="btn md white" href="#/beef/${x.id}">לראות</a></div></div>`;
      case 'gesture': return `<div class="card lime wcard">
        ${head('', `${esc(f.name)} ${K.gv(f, 'הציעה', 'הציע')} ${GEST()[x.gesture].name} ${GEST()[x.gesture].emoji}`)}
        <div class="small">על "${esc(x.reason)}"</div>
        <div class="acts"><button class="btn md white" data-gok="${x.id}">סגרנו! 🤝</button><button class="btn md white" data-gno="${x.id}">זה לא מספיק 😤</button></div></div>`;
      case 'wantmore': return `<div class="card peach wcard">
        ${head('', `${esc(f.name)} ${K.gv(f, 'רוצה', 'רוצה')} יותר 😤`)}
        <div class="small">${GEST()[x.gesture].name} לא הספיק על "${esc(x.reason)}"</div>
        <div class="acts"><a class="btn md" href="#/settle/${x.id}?coffee=1">לשלוח קפה ☕</a><a class="btn md white" href="#/settle/${x.id}">משהו אחר</a></div></div>`;
      case 'challenge': return `<div class="card lime wcard">
        <a href="#/bet/${x.id}" style="text-decoration:none;color:inherit">${head('', `${esc(f.name)} ${K.gv(f, 'זרקה', 'זרק')} לך כפפה 🥊`, `<span style="font-size:24px">${x.stake === 'gift' ? x.product.emoji : '🏆'}</span>`)}</a>
        <div class="small">${esc(x.topic)}</div>
        <div class="acts"><button class="btn md" data-bin="${x.id}">אני בפנים</button><button class="btn md white" data-bout="${x.id}">לא הפעם</button></div></div>`;
      case 'owe': return `<div class="card lav wcard">
        ${head('', x.remindedAt ? `${esc(f.name)} עדיין ${K.gv(f, 'מחכה', 'מחכה')} ל${esc(x.product.name)} ${x.product.emoji}😏` : `הפסדת 😅 ${esc(f.name)} ${K.gv(f, 'מחכה', 'מחכה')} ל${esc(x.product.name)}`)}
        <div class="small">${esc(x.topic)}</div>
        <div class="acts"><a class="btn md lime" href="#/bet/${x.id}">לשלוח ${x.product.emoji} · ${K.money(x.product.price)}</a></div></div>`;
      case 'claim': return `<div class="card lime wcard"><a href="#/bet/${x.id}" style="text-decoration:none;color:inherit">${head('', 'נגמר הזמן ⏱ מי ניצח?')}</a><div class="small">${esc(x.topic)}</div></div>`;
      case 'karma': return `<a class="card pink wcard" href="#/karma/${x.id}" style="text-decoration:none">
        ${head("You've been KARMAd 😇", `${esc(f.name)}: ${x.occ.name} ${x.occ.emoji}`, x.gift ? `<span style="font-size:26px">🎁</span>` : '')}</a>`;
    }
    return '';
  }
  function wireWaiting() {
    K.on('[data-gok]', 'click', async (e) => { const id = e.currentTarget.dataset.gok; await A().respondGesture(id, true); K.go('closed/' + id); });
    K.on('[data-gno]', 'click', async (e) => { await A().respondGesture(e.currentTarget.dataset.gno, false); K.toast('שלחנו שזה לא מספיק 😤'); });
    K.on('[data-bin]', 'click', async (e) => { const id = e.currentTarget.dataset.bin; await A().respondBet(id, true); K.go('bet/' + id); });
    K.on('[data-bout]', 'click', async (e) => { await A().respondBet(e.currentTarget.dataset.bout, false); K.toast('אולי בפעם הבאה 🥊'); });
  }
  K.wireWaiting = wireWaiting;

  const balanceLine = (fid) => { const b = A().balanceWith(fid); return `<a class="balance" href="#/friend/${fid}" style="text-decoration:none">המאזן ביניכם: <span>😇 ${b.good}</span><span>·</span><span>😈 ${b.bad}</span></a>`; };

  // ───────── a beef on me (full-screen moment) ─────────
  K.route('beef', (id) => {
    const b = A().beef(id);
    if (!b) return K.go('');
    if (b.from === 'me') return K.go('mine/' + id);
    if (['settled', 'released', 'cooled'].includes(b.status)) return K.go('closed/' + id);
    const f = b.friend;
    const first = K.q.get('first');
    const cool = K.coolLeft(b);
    let actions;
    if (b.status === 'open') actions = `
      <button class="btn" id="settle">לסגור חשבון</button>
      <button class="btn md white" id="back">להחזיר ביף 😏</button>
      <button class="link muted" id="report">זה לא מצחיק אותי</button>`;
    else if (b.status === 'pending') actions = `
      <div class="note center">הצעת ${GEST()[b.gesture].name} ${GEST()[b.gesture].emoji}. מחכים ל${esc(f.name)}…</div>
      <a class="btn md lime" href="#/settle/${id}?coffee=1">לשדרג לקפה ☕ · סוגר מיד</a>`;
    else if (b.status === 'wantmore') actions = `
      <div class="warn center">${esc(f.name)} ${K.gv(f, 'רוצה', 'רוצה')} יותר 😤</div>
      <a class="btn" href="#/settle/${id}?coffee=1">לשלוח קפה ☕</a>
      <a class="btn md white" href="#/settle/${id}">להציע משהו אחר</a>`;
    K.render(`
      <span class="kicker">You've been KARMAd 😈</span>
      <div class="col center" style="gap:6px">${K.av(f, 'xl')}<h1>ל${esc(f.name)} יש ביף איתך</h1><span class="small muted">${K.timeAgo(b.createdAt)}</span></div>
      <div class="sticker center" style="padding:22px 16px"><span class="big-reason">${esc(b.reason)}</span><span style="align-self:center">${K.chilis(b.spice).replace('chilis', 'chilis lg')}</span></div>
      ${balanceLine(f.id)}
      ${cool ? `<p class="micro center muted" style="margin:0">❄️ ביף קליל. מתקרר לבד ${cool} אם לא סוגרים.</p>` : ''}
      <div class="stack-bottom">${actions}</div>`, {
      theme: 'peach',
      moment: { close: first ? '' : '', share: () => K.shareStory({ bg: 'peach', kicker: "You've been KARMAd 😈", title: `ל${f.name} יש ביף איתי`, card: { lines: [b.reason, '🌶'.repeat(b.spice)] }, sub: 'מה עשיתי? 🙈' }, 'beef') },
    });
    if (first) { A().setOnboarded(); A().clearInvite(); }
    K.on('#settle', 'click', () => K.go('settle/' + id));
    K.on('#back', 'click', () => K.go(`new-beef?to=${f.id}&ret=1`));
    K.on('#report', 'click', async () => {
      const ok = await K.confirm('להוריד את הביף?', `${f.name} לא ${K.gv(f, 'תדע', 'ידע')} שזה בגללך. אם זה קורה שוב, אנחנו בודקים.`, 'להוריד', 'השאר', true);
      if (!ok) return; await A().report(id); K.toast('ירד. תודה שאמרת 🙏'); K.go('');
    });
  });

  // ───────── settle ─────────
  K.route('settle', (id) => {
    const b = A().beef(id);
    if (!b || b.to !== 'me') return K.go('');
    const f = b.friend;
    const all = A().suggest({ spice: b.spice, friendId: f.id });
    const rec = all[0];
    let sel = K.q.get('coffee') ? (all.find((p) => p.id === 'p-coffee') || rec).id : null;
    let showAll = false;
    const rejected = b.status === 'wantmore' ? b.gesture : null;
    const recGesture = b.spice === 1 ? 'apology' : null;
    const draw = () => {
      const list = showAll ? all : all.slice(0, 3);
      if (sel && !list.some((p) => p.id === sel) && !GEST()[sel]) list.push(all.find((p) => p.id === sel));
      const pick = all.find((p) => p.id === sel);
      const g = GEST()[sel];
      K.render(`
        ${K.header('לסגור חשבון', { close: true })}
        <div class="card peach row">${K.av(f)}<div style="flex:1"><b>${esc(b.reason)}</b><div class="micro">${esc(f.name)} · ${K.timeAgo(b.createdAt)}</div></div>${K.chilis(b.spice)}</div>
        <section class="col">
          <div class="sec"><h2>מתנה אמיתית 🎁</h2><span class="pill lime">סוגר מיד</span></div>
          <div class="col" style="gap:12px">${list.map((p) => K.prodCard(p, { on: sel === p.id, badge: p.id === rec.id && b.spice > 1 ? `מומלץ ל-${'🌶'.repeat(b.spice)}` : A().likedBy(f.id, p) ? `❤ ${f.name} ${K.gv(f, 'אוהבת', 'אוהב')}` : '', badgeCls: p.id === rec.id && b.spice > 1 ? '' : 'pink' })).join('')}</div>
          ${showAll ? '' : `<button class="link" id="more">עוד ›</button>`}
        </section>
        <section class="col">
          <div class="sec"><h2>או משהו בחינם</h2><span class="pill">${esc(f.name)} ${K.gv(f, 'צריכה', 'צריך')} לאשר</span></div>
          ${Object.values(GEST()).filter((x) => x.id !== rejected).map((x) => `<button class="opt" data-g="${x.id}" aria-pressed="${sel === x.id}"><span class="em">${x.emoji}</span><span style="flex:1"><span class="t">${x.name}</span>${x.id === recGesture ? ' <span class="badge">מומלץ ל-🌶</span>' : ''}<br><span class="s">${x.desc}</span></span></button>`).join('')}
        </section>
        <div class="stack-bottom">
          <button class="btn ${pick ? 'lime' : ''}" id="go" ${sel ? '' : 'disabled'}>${pick ? `לשלם ${K.money(pick.price)} ולסגור` : g ? 'לשלוח הצעה' : 'בוחרים איך סוגרים'}</button>
          ${pick ? `<p class="micro muted center" style="margin:0">${esc(f.name)} ${K.gv(f, 'תאסוף', 'יאסוף')} מ${esc(pick.biz.name)} עם קוד. אפשר לבטל תוך 24 שעות.</p>` : ''}
        </div>`);
      K.wireBack('beef/' + id);
      K.on('.prod', 'click', (e) => { sel = e.currentTarget.dataset.pid; draw(); });
      K.on('[data-g]', 'click', (e) => { sel = e.currentTarget.dataset.g; draw(); });
      K.on('#more', 'click', () => { showAll = true; draw(); });
      K.on('#go', 'click', async () => {
        if (pick) {
          if (!(await K.pay(pick.price, `${pick.emoji} ${pick.name} · ${pick.biz.name}`))) return;
          await A().settleWithGift(id, pick.id); K.go('closed/' + id);
        } else if (g) {
          await A().offerGesture(id, sel); K.toast(`ההצעה נשלחה ל${f.name} ${g.emoji}`); K.go('beef/' + id);
        }
      });
    };
    draw();
  });

  // ───────── closed ─────────
  const dur = (b) => {
    const m = Math.round((new Date(b.closedAt) - new Date(b.createdAt)) / 60000);
    if (m < 60) return `תוך ${Math.max(m, 1)} דקות ⚡`;
    const h = Math.round(m / 60); if (h < 24) return h === 1 ? 'תוך שעה ⚡' : h === 2 ? 'תוך שעתיים ⚡' : `תוך ${h} שעות ⚡`;
    const d = Math.round(h / 24); return d === 1 ? 'תוך יום' : `אחרי ${d} ימים 🐢`;
  };
  K.closedWith = (b) => b.closedBy === 'gift' && b.gift ? `נסגר ב${b.gift.product.name} ${b.gift.product.emoji}` : b.closedBy === 'gesture' ? `נסגר ב${GEST()[b.gesture].name} ${GEST()[b.gesture].emoji}` : b.closedBy === 'release' ? 'שוחרר 🕊' : 'התקרר לבד ❄️';
  K.route('closed', (id) => {
    const b = A().beef(id);
    if (!b) return K.go('');
    const f = b.friend, me = A().me();
    const iGetGift = b.gift && b.gift.to === 'me';
    const isClosed = b.status === 'settled';
    const title = b.status === 'released' ? 'שחררתי 🕊' : b.status === 'cooled' ? 'התקרר ❄️' : 'תיק סגור ✓';
    K.render(`
      <div class="stamp" style="margin-top:12px">${title}</div>
      <div class="pair" style="margin-top:8px">${K.av(b.fromP, 'xl')}<span class="shake">🤝</span>${K.av(b.toP, 'xl')}</div>
      <div class="sticker center" style="transform:rotate(1.5deg)"><span class="big-reason strike">${esc(b.reason)}</span>${K.chilis(b.spice)}</div>
      <div class="col center" style="gap:6px"><h2>${K.closedWith(b)}</h2>${isClosed ? `<span class="pill">${dur(b)}</span>` : ''}</div>
      ${iGetGift && b.gift.status === 'active' ? `<div class="card row"><span style="font-size:32px">${b.gift.product.emoji}</span><div style="flex:1"><b>${esc(b.gift.product.name)} מחכה לך</b><div class="small">${esc(b.gift.product.biz.name)}</div></div></div>` : ''}
      ${b.gift && b.gift.from === 'me' ? `<p class="center small" style="margin:0">${esc(f.name)} ${K.gv(f, 'תקבל', 'יקבל')} קוד לאיסוף. ההנאה כולה ${K.gv(f, 'שלה', 'שלו')}.</p>` : ''}
      <div class="stack-bottom">
        ${iGetGift && b.gift.status === 'active' ? `<a class="btn lime" href="#/redeem/${b.gift.id}">לממש 🎁</a>` : ''}
        ${isClosed ? `<button class="btn md white" id="share">⤴ לסטורי</button>` : ''}
        <a class="btn ghost" href="#/">חזרה הביתה</a>
      </div>`, { theme: 'lime', moment: { close: '', share: isClosed ? share : null } });
    function share() { K.shareStory({ bg: 'lime', kicker: 'CASE CLOSED ✓', title: `${b.fromP.name} 🤝 ${b.toP.name}`, card: { lines: [b.reason, 'תיק סגור ✓'] }, sub: `נסגר ${dur(b)}` }, 'closed'); }
    K.on('#share', 'click', share);
    if (isClosed) K.askBirthday();
  });

  // ───────── a beef I opened ─────────
  K.route('mine', (id) => {
    const b = A().beef(id);
    if (!b) return K.go('');
    if (b.from !== 'me') return K.go('beef/' + id);
    if (['settled', 'released', 'cooled'].includes(b.status)) return K.go('closed/' + id);
    const f = b.friend, cool = K.coolLeft(b);
    let body;
    if (b.status === 'open') body = f.invited
      ? `<div class="note center">⏳ ${esc(f.name)} עוד לא ${K.gv(f, 'הצטרפה', 'הצטרף')}. ההזמנה בוואטסאפ.</div><button class="btn md white" id="resend">${K.ICON.wa}<span>לשלוח שוב בוואטסאפ</span></button>`
      : `<div class="note center">מחכים ש${esc(f.name)} ${K.gv(f, 'תסגור', 'יסגור')}… ⏳</div>${cool ? `<p class="micro center muted" style="margin:0">❄️ מתקרר לבד ${cool}</p>` : ''}`;
    else if (b.status === 'pending') body = `
      <div class="card lime col center"><span style="font-size:40px">${GEST()[b.gesture].emoji}</span><h2>${esc(f.name)} ${K.gv(f, 'הציעה', 'הציע')} ${GEST()[b.gesture].name}</h2><span class="small">${K.timeAgo(b.gestureAt)}</span></div>
      <div class="row"><button class="btn lime" id="ok" style="flex:1">סגרנו! 🤝</button><button class="btn white" id="no" style="flex:1">זה לא מספיק 😤</button></div>`;
    else if (b.status === 'wantmore') body = `<div class="note center">ביקשת יותר 😤 מחכים ש${esc(f.name)} ${K.gv(f, 'תשדרג', 'ישדרג')}…</div>`;
    K.render(`
      ${K.header('הביף שפתחת', { close: true })}
      <div class="col center" style="gap:6px">${K.av(f, 'lg')}<b>על ${esc(f.name)}</b><span class="micro muted">${K.timeAgo(b.createdAt)}</span></div>
      <div class="sticker center"><span class="big-reason">${esc(b.reason)}</span><span style="align-self:center">${K.chilis(b.spice)}</span></div>
      ${body}
      <div class="stack-bottom">${b.status !== 'pending' ? `<button class="btn ghost" id="rel">שחררתי 🕊</button>` : ''}</div>`);
    K.wireBack('accounts');
    K.on('#ok', 'click', async () => { await A().respondGesture(id, true); K.go('closed/' + id); });
    K.on('#no', 'click', async () => { await A().respondGesture(id, false); K.toast(`שלחנו ל${f.name} שזה לא מספיק 😤`); K.routeNow(); });
    K.on('#resend', 'click', () => K.shareWA(K.inviteText('beef')));
    K.on('#rel', 'click', async () => {
      if (!(await K.confirm('לשחרר?', `הביף נסגר בלי כלום. ${f.name} ${K.gv(f, 'תקבל', 'יקבל')} הודעה ששחררת.`, 'שחררתי 🕊', 'עוד לא'))) return;
      await A().release(id); K.go('closed/' + id);
    });
  });

  // ───────── new beef ─────────
  K.route('new-beef', () => {
    const st = { to: K.q.get('to') || null, reason: null, custom: '', spice: 2 };
    const ret = K.q.get('ret');
    const draw = () => {
      const f = st.to && A().friend(st.to);
      const reason = st.reason === '__custom' ? st.custom.trim() : st.reason;
      const hint = { 1: '❄️ קליל. מתקרר לבד אחרי שבוע אם לא סוגרים.', 2: '☕ קלאסי. קפה סוגר את זה.', 3: '🥐 נשאר פתוח עד שסוגרים. מתאים לקפה ומאפה.' }[st.spice];
      K.render(`
        ${K.header(ret ? 'להחזיר ביף 😏' : 'ביף חדש 😈', { close: true })}
        <section class="col"><h3>על מי?</h3>${K.friendPicker(st.to)}</section>
        <section class="col"><h3>מה קרה?</h3>
          <div class="wrap">${A().PRESETS.map((p) => `<button class="chip" data-r="${esc(p)}" aria-pressed="${st.reason === p}">${esc(p)}</button>`).join('')}
          <button class="chip" data-r="__custom" aria-pressed="${st.reason === '__custom'}">✏️ משהו אחר</button></div>
          ${st.reason === '__custom' ? `<input class="input" id="custom" maxlength="60" placeholder="מה ${f ? esc(f.name) : 'הוא'} עשה?" value="${esc(st.custom)}"><div class="row between"><div class="warn" id="mw" hidden></div><span class="counter-hint" id="cnt">${st.custom.length}/60</span></div>` : ''}
        </section>
        <section class="col"><h3>כמה חריף?</h3>
          <div class="grid3">${[1, 2, 3].map((n) => `<button class="spice" data-s="${n}" aria-pressed="${st.spice === n}" aria-label="חריפות ${n} מתוך 3"><span style="font-size:22px">${'🌶'.repeat(n)}</span></button>`).join('')}</div>
          <p class="micro muted" style="margin:0">${hint}</p>
        </section>
        ${f && (reason || st.reason === '__custom') ? `<section class="col"><h3>ככה ${esc(f.name)} ${K.gv(f, 'תראה', 'יראה')} את זה:</h3>
          <div class="card peach wcard"><div class="head">${K.av(A().me())}<div class="body"><div class="k">You've been KARMAd 😈</div><b>ל${esc(A().me().name)} יש ביף איתך</b><div class="small" id="pv">${esc(reason || '…')}</div></div>${K.chilis(st.spice)}</div></div></section>` : ''}
        <div class="stack-bottom">
          <button class="btn" id="send" ${f && reason ? '' : 'disabled'}>${f && f.invited ? `${K.ICON.wa}<span>לשלוח בוואטסאפ 😈</span>` : 'לשלוח 😈'}</button>
        </div>`);
      K.wireBack('');
      K.wirePicker((fid) => { st.to = fid; draw(); });
      K.on('[data-r]', 'click', (e) => { st.reason = e.currentTarget.dataset.r; draw(); if (st.reason === '__custom') document.getElementById('custom').focus(); });
      K.on('[data-s]', 'click', (e) => { st.spice = +e.currentTarget.dataset.s; draw(); });
      const c = document.getElementById('custom');
      if (c) c.addEventListener('input', () => {
        st.custom = c.value; document.getElementById('cnt').textContent = `${c.value.length}/60`;
        const bad = K.modWarn(document.getElementById('mw'), c.value);
        document.getElementById('send').disabled = !(f && c.value.trim()) || !!bad;
        const pv = document.getElementById('pv'); if (pv) pv.textContent = c.value.trim() || '…';
      });
      K.on('#send', 'click', async () => {
        try {
          const nb = await A().newBeef({ to: st.to, reason: st.reason === '__custom' ? st.custom.trim() : st.reason, spice: st.spice });
          if (f.invited) K.shareWA(K.inviteText('beef'));
          K.toast(`נשלח ל${f.name} 😈`); K.go('mine/' + nb.id);
        } catch (e) { K.toast(K.errText(e)); }
      });
    };
    draw();
  });

  // ───────── חשבונות ─────────
  K.route('accounts', () => {
    const tab = K.q.get('t') || K.state.accTab || 'beefs';
    const filter = K.q.get('f') || K.state.accFilter || 'open';
    K.state.accTab = tab; K.state.accFilter = filter;
    let body = '';
    if (tab === 'beefs') {
      const b = A().beefs();
      if (filter === 'open') {
        body = `
          <section class="col"><div class="sec"><h2>${K.U('מחכים לך 😈', 'עלייך לסגור 😈', 'עליך לסגור 😈')}</h2><span class="pill">${b.onMe.length}</span></div>
            ${b.onMe.length ? b.onMe.map((x) => K.beefRow(x, { cool: true })).join('') : '<p class="muted small" style="margin:0">אין ביפים עלייך. קארמה נקייה ✨</p>'}</section>
          <section class="col"><div class="sec"><h2>${K.U('פתחת 😏', 'את פתחת 😏', 'אתה פתחת 😏')}</h2><span class="pill">${b.mine.length}</span></div>
            ${b.mine.length ? b.mine.map((x) => K.beefRow(x, { cool: true }) + (x.status === 'pending' ? `<div class="row" style="margin-top:-4px"><button class="btn md lime" data-gok="${x.id}" style="flex:1">סגרנו! 🤝</button><button class="btn md white" data-gno="${x.id}" style="flex:1">זה לא מספיק 😤</button></div>` : '')).join('') : '<p class="muted small" style="margin:0">עוד לא פתחת ביף על אף אחד. באמת? 😇</p>'}</section>`;
      } else body = b.closed.length ? `<div class="col">${b.closed.map((x) => K.beefRow(x)).join('')}</div>` : '<p class="muted">עוד לא נסגר כלום.</p>';
    } else {
      const s = A().betsAll();
      const row = (x) => `<a class="beef" href="#/bet/${x.id}">${K.av(x.friend)}<span class="body"><span class="reason">${esc(x.topic)}</span><span class="meta">${esc(x.friend.name)} · ${x.stake === 'gift' ? x.product.emoji + ' ' + esc(x.product.name) : '🏆 על הכבוד'}</span></span>${betPill(x)}</a>`;
      body = `<div class="card lime row between"><div><div class="micro"><b>המאזן שלך</b></div><div class="record">${s.record.won}–${s.record.lost} 🏆</div></div><a class="btn md" href="#/new-bet" style="width:auto">🥊 התערבות חדשה</a></div>`;
      body += filter === 'open'
        ? `<section class="col"><div class="sec"><h2>מחכות לך</h2><span class="pill">${s.waiting.length}</span></div>${s.waiting.length ? s.waiting.map(row).join('') : '<p class="muted small" style="margin:0">אין כלום שמחכה לך.</p>'}</section>
           <section class="col"><div class="sec"><h2>פתוחות</h2><span class="pill">${s.open.length}</span></div>${s.open.length ? s.open.map(row).join('') : '<p class="muted small" style="margin:0">אין התערבויות פתוחות.</p>'}</section>`
        : `<div class="col">${s.done.map(row).join('') || '<p class="muted">עוד אין.</p>'}</div>`;
    }
    K.render(`
      ${K.homeHeader()}
      <h1>חשבונות</h1>
      <div class="seg" role="group" aria-label="סוג"><button data-t="beefs" aria-pressed="${tab === 'beefs'}">ביפים 😈</button><button data-t="bets" aria-pressed="${tab === 'bets'}">התערבויות 🥊</button></div>
      <div class="tabs" role="tablist"><button class="tab" role="tab" data-f="open" aria-selected="${filter === 'open'}">פתוחים</button><button class="tab" role="tab" data-f="closed" aria-selected="${filter === 'closed'}">נסגרו</button></div>
      ${body}`, { nav: 'accounts' });
    K.on('[data-t]', 'click', (e) => K.go('accounts?t=' + e.currentTarget.dataset.t + '&f=' + filter));
    K.on('[data-f]', 'click', (e) => K.go('accounts?t=' + tab + '&f=' + e.currentTarget.dataset.f));
    wireWaiting();
  });
  function betPill(x) {
    if (x.status === 'pending') return `<span class="pill peach">${x.to === 'me' ? 'כפפה! 🥊' : 'מחכה לתשובה'}</span>`;
    if (x.status === 'disputed') return '<span class="pill peach">לא מסכימים 🤨</span>';
    if (x.status === 'lost' && !x.giftId) return '<span class="pill peach">הפסדת 😅</span>';
    if (x.status === 'active') return new Date(x.deadline) < new Date() ? '<span class="pill lime">מי ניצח?</span>' : `<span class="pill">עד ${K.dateShort(x.deadline)}</span>`;
    if (x.status === 'declined') return '<span class="pill lav">לא הפעם</span>';
    return x.winner === 'me' ? '<span class="pill lime">ניצחת 🏆</span>' : '<span class="pill lav">הפסדת</span>';
  }
  K.betPill = betPill;
})();
