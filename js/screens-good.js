// Good karma (send / receive / tab), wallet and redeeming a gift at the counter.
(function () {
  const esc = K.esc;
  const A = () => K.api;

  // ───────── new good karma ─────────
  K.route('new-karma', () => {
    const st = { to: K.q.get('to') || null, occ: K.q.get('occ') || null, msg: '', pid: null, noGift: false, onBday: K.q.get('occ') === 'bday', more: false };
    const draw = () => {
      const f = st.to && A().friend(st.to);
      const all = A().suggest({ occasion: st.occ, friendId: st.to });
      const list = st.more ? all : all.slice(0, 3);
      if (st.pid && !list.some((p) => p.id === st.pid)) list.push(all.find((p) => p.id === st.pid));
      const pick = st.pid && A().product(st.pid);
      const days = f && f.birthday ? K.daysToBirthday(f.birthday) : null;
      const canSchedule = st.occ === 'bday' && days != null && days > 0;
      const occ = A().OCCASIONS.find((o) => o.id === st.occ);
      const ready = f && st.occ && (st.pid || st.noGift);
      K.render(`
        ${K.header('גוד קארמה 😇', { close: true })}
        <p class="muted" style="margin:-8px 0 0">מפרגנים למישהו. מילים טובות, ואם בא לך גם מתנה קטנה שהוא אוסף בעסק.</p>
        <section class="col"><h3>למי?</h3>${K.friendPicker(st.to)}</section>
        <section class="col"><h3>על מה?</h3>
          <div class="wrap">${A().OCCASIONS.map((o) => `<button class="chip" data-o="${o.id}" aria-pressed="${st.occ === o.id}">${o.emoji} ${o.name}</button>`).join('')}</div></section>
        <section class="col"><label class="field" for="msg">כמה מילים (לא חובה)</label>
          <textarea class="input" id="msg" maxlength="120" rows="2" placeholder="${f ? `מה בא לך להגיד ל${esc(f.name)}?` : ''}">${esc(st.msg)}</textarea>
          <div class="warn" id="mw" hidden></div></section>
        <section class="col"><div class="sec"><h3>מתנה?</h3>${f && Object.values(f.likes || {}).some(Boolean) ? `<a class="micro" href="#/friend/${f.id}">מה משמח את ${esc(f.name)} ›</a>` : ''}</div>
          <div class="col" style="gap:12px">${list.map((p) => K.prodCard(p, { on: st.pid === p.id, badge: f && A().likedBy(f.id, p) ? `❤ ${f.name} ${K.gv(f, 'אוהבת', 'אוהב')}` : '', badgeCls: 'pink' })).join('')}</div>
          ${st.more ? '' : '<button class="link" id="more">עוד ›</button>'}
          <button class="opt" id="nogift" aria-pressed="${st.noGift}"><span class="em">💌</span><span class="t">בלי מתנה, רק מילים</span></button>
        </section>
        ${canSchedule ? `<label class="check"><input type="checkbox" id="bd" ${st.onBday ? 'checked' : ''}><span>לשלוח ביום ההולדת ב-00:00<span class="sub">בעוד ${days} ימים · ${K.bdayText(f.birthday)}</span></span></label>` : ''}
        ${ready ? `<section class="col"><h3>ככה זה ייראה:</h3>
          <div class="card pink wcard"><div class="head">${K.av(A().me())}<div class="body"><div class="k">You've been KARMAd 😇</div><b>${esc(A().me().name)}: ${occ.name} ${occ.emoji}</b>${st.msg ? `<div class="small">${esc(st.msg)}</div>` : ''}</div>${pick ? `<span style="font-size:26px">${pick.emoji}</span>` : ''}</div></div></section>` : ''}
        <div class="stack-bottom">
          <button class="btn pink" id="send" ${ready ? '' : 'disabled'}>${!ready ? 'לשלוח 😇' : pick ? `לשלם ${K.money(pick.price)} ולשלוח` : f.invited ? `${K.ICON.wa}<span>לשלוח בוואטסאפ 😇</span>` : 'לשלוח 😇'}</button>
        </div>`);
      K.wireBack('good');
      K.wirePicker((fid) => { st.to = fid; draw(); });
      K.on('[data-o]', 'click', (e) => { st.occ = e.currentTarget.dataset.o; st.onBday = st.occ === 'bday'; draw(); });
      K.on('.prod', 'click', (e) => { st.pid = e.currentTarget.dataset.pid; st.noGift = false; draw(); });
      K.on('#nogift', 'click', () => { st.noGift = true; st.pid = null; draw(); });
      K.on('#more', 'click', () => { st.more = true; draw(); });
      K.on('#bd', 'change', (e) => { st.onBday = e.target.checked; });
      const m = document.getElementById('msg');
      m.addEventListener('input', () => { st.msg = m.value; const bad = K.modWarn(document.getElementById('mw'), m.value); document.getElementById('send').disabled = !ready || !!bad; });
      K.on('#send', 'click', async () => {
        try {
          if (pick && !(await K.pay(pick.price, `${pick.emoji} ${pick.name} · ${pick.biz.name}`))) return;
          const k = await A().sendKarma({ to: st.to, occasion: st.occ, message: st.msg.trim(), productId: st.pid, onBirthday: canSchedule && st.onBday });
          if (f.invited) K.shareWA(K.inviteText('karma'));
          K.go('karma/' + k.id + '?sent=1');
        } catch (e) { K.toast(K.errText(e)); }
      });
    };
    draw();
  });

  // ───────── a good karma (received = pink moment, sent = summary) ─────────
  K.route('karma', (id) => {
    const k = A().karmaItem(id);
    if (!k) return K.go('');
    const f = k.friend;
    if (k.from === 'me') return sentView(k);
    A().seeKarma(id);
    const first = K.q.get('first');
    const g = k.gift;
    K.render(`
      <div class="card wcard" style="margin-top:4px"><div class="head">${K.av(f)}<div class="body"><div class="k">You've been KARMAd 😇</div><b>${esc(f.name)} ${K.gv(f, 'שלחה', 'שלח')} לך גוד קארמה</b></div><span class="micro muted">${K.timeAgo(k.deliverAt)}</span></div></div>
      <div class="huge">GOOD<br>KARMA</div>
      <div class="sticker center" style="box-shadow:6px 6px 0 var(--ink)">
        <span class="h2">${k.occ.emoji} ${k.occ.name}</span>
        ${k.message ? `<span style="font-size:18px">"${esc(k.message)}"</span>` : ''}
        <span class="small muted">— ${esc(f.name)}</span></div>
      ${g ? `<div class="card row"><span style="font-size:36px">${g.product.emoji}</span><div style="flex:1"><b>${esc(g.product.name)}</b><div class="small">${esc(g.product.biz.name)} · ${esc(g.product.biz.address)}</div><div class="micro">${g.status === 'active' ? K.validity(g) : 'מומש ✓'}</div></div></div>` : ''}
      <p class="center small" style="margin:0">${K.U('ולא, אין שום חובה להחזיר 😉', 'ולא, את לא חייבת כלום בחזרה 😉', 'ולא, אתה לא חייב כלום בחזרה 😉')}</p>
      <div class="stack-bottom">
        ${g && g.status === 'active' ? `<a class="btn lime" href="#/redeem/${g.id}">לממש 🎁</a>` : ''}
        <button class="btn md white" id="thx" ${k.thankedByMe ? 'disabled' : ''}>${k.thankedByMe ? 'התודה נשלחה 💌' : 'לשלוח תודה 💌'}</button>
        <a class="link" href="#/new-karma?to=${f.id}">להחזיר גוד קארמה</a>
      </div>`, {
      theme: 'hotpink',
      moment: { close: '', share: () => K.shareStory({ bg: 'pink', kicker: "You've been KARMAd 😇", big: 'GOOD KARMA', bigLtr: true, card: { lines: [`${k.occ.name} ${k.occ.emoji}`, `מ${f.name}`], fill: 'white' }, sub: k.message || '' }, 'good-karma') },
    });
    if (first) { A().setOnboarded(); A().clearInvite(); }
    K.on('#thx', 'click', async () => { await A().thank(id); K.toast(`התודה נשלחה ל${f.name} 💌`); K.routeNow(); });
    K.askBirthday();
  });

  function sentView(k) {
    const f = k.friend, sent = K.q.get('sent');
    const scheduled = new Date(k.deliverAt) > new Date();
    K.render(`
      ${sent ? '' : K.header('גוד קארמה ששלחת')}
      ${sent ? `<div class="col center" style="gap:8px;margin-top:30px"><div style="font-size:64px">😇</div><h1>${scheduled ? 'מתוזמן!' : 'נשלח!'}</h1>
        <p style="margin:0">${scheduled ? `תגיע ל${esc(f.name)} ב-00:00 ביום ההולדת 🎂` : `${esc(f.name)} ${K.gv(f, 'קיבלה', 'קיבל')} התראה עכשיו.`}</p></div>` : ''}
      <div class="card pink wcard"><div class="head">${K.av(f)}<div class="body"><b>ל${esc(f.name)}: ${k.occ.name} ${k.occ.emoji}</b>${k.message ? `<div class="small">"${esc(k.message)}"</div>` : ''}</div>${k.gift ? `<span style="font-size:26px">${k.gift.product.emoji}</span>` : ''}</div>
        <div class="micro">${scheduled ? `⏰ ${K.whenFuture(k.deliverAt)}` : K.timeAgo(k.deliverAt)}${k.thanked ? ` · 💌 ${esc(f.name)} ${K.gv(f, 'אמרה', 'אמר')} תודה` : ''}</div></div>
      ${k.gift ? `<p class="micro muted center" style="margin:0">🔒 לא נודיע לך מתי ${K.gv(f, 'היא', 'הוא')} ${K.gv(f, 'מממשת', 'מממש')}. זה רק ${K.gv(f, 'שלה', 'שלו')}.</p>` : ''}
      <div class="stack-bottom">
        ${f.invited ? `<button class="btn md white" id="wa">${K.ICON.wa}<span>לשלוח שוב בוואטסאפ</span></button>` : ''}
        ${sent ? `<a class="btn" href="#/good">סגור</a>` : ''}
      </div>`, { theme: sent ? 'pink' : '' });
    K.wireBack('good');
    K.on('#wa', 'click', () => K.shareWA(K.inviteText('karma')));
    if (sent) K.askBirthday();
  }

  // ───────── גוד קארמה tab ─────────
  K.route('good', () => {
    const tab = K.q.get('t') || 'got';
    const l = A().karmaList();
    const month = Date.now() - 30 * 864e5;
    const gotM = l.got.filter((k) => new Date(k.deliverAt) > month).length, sentM = l.sent.filter((k) => new Date(k.createdAt) > month).length;
    const soon = A().friends().map((f) => ({ f, d: K.daysToBirthday(f.birthday) })).filter((x) => x.d != null && x.d <= 30).sort((a, b) => a.d - b.d);
    const list = tab === 'got' ? l.got : l.sent;
    const row = (k) => {
      const sched = new Date(k.deliverAt) > new Date();
      return `<a class="beef" href="#/karma/${k.id}">${K.av(k.friend)}<span class="body"><span class="reason">${k.occ.emoji} ${k.occ.name}${k.message ? ` · ${esc(k.message)}` : ''}</span>
        <span class="meta">${tab === 'got' ? 'מ' : 'ל'}${esc(k.friend.name)} · ${sched ? '⏰ ' + K.whenFuture(k.deliverAt) : K.timeAgo(k.deliverAt)}</span></span>${k.gift ? `<span style="font-size:22px">${k.gift.product.emoji}</span>` : ''}</a>`;
    };
    K.render(`
      ${K.header('גוד קארמה 😇')}
            ${soon.length ? `<section class="col"><h2>🎂 בקרוב</h2><div class="list">${soon.map(({ f, d }) => `<a href="#/new-karma?to=${f.id}&occ=bday">${K.av(f, 'sm')}<span class="grow"><b>${esc(f.name)}</b> · ${K.bdayText(f.birthday)}</span><span class="pill ${d <= 7 ? 'pink' : ''}">${d === 0 ? 'היום!' : d === 1 ? 'מחר' : `עוד ${d} ימים`}</span></a>`).join('')}</div></section>`
        : `<a class="card lav row" href="#/new-karma?occ=thanks" style="text-decoration:none"><span style="font-size:28px">🙏</span><b style="flex:1">מתי בפעם האחרונה אמרת תודה למישהו?</b>${K.ICON.fwd}</a>`}
      <a class="btn pink" href="#/new-karma">לשלוח גוד קארמה 😇</a>
      <div class="seg"><button data-t="got" aria-pressed="${tab === 'got'}">קיבלתי</button><button data-t="sent" aria-pressed="${tab === 'sent'}">שלחתי</button></div>
      <div class="col">${list.map(row).join('') || `<p class="muted center">${tab === 'got' ? 'עוד לא קיבלת. זה יגיע 😇' : 'עוד לא שלחת. מישהו בטוח מחכה.'}</p>`}</div>`, { nav: 'good' });
    K.wireBack('');
    K.on('[data-t]', 'click', (e) => K.go('good?t=' + e.currentTarget.dataset.t));
  });

  // ───────── המתנות שלי ─────────
  K.route('wallet', () => {
    const tab = K.q.get('tab') || 'active';
    const w = A().wallet();
    const soon = w.active.filter((g) => new Date(g.expiresAt) - Date.now() < 7 * 864e5);
    const rest = w.active.filter((g) => !soon.includes(g));
    K.render(`
      ${K.homeHeader()}
      <h1>המתנות שלי</h1>
      <div class="tabs" role="tablist"><button class="tab" role="tab" data-t="active" aria-selected="${tab === 'active'}">למימוש (${w.active.length})</button><button class="tab" role="tab" data-t="used" aria-selected="${tab === 'used'}">מומשו (${w.used.length})</button></div>
      ${tab === 'active' ? `
        ${soon.length ? `<section class="col"><h2>⏳ עומד לפוג</h2>${soon.map(K.giftCard).join('')}</section>` : ''}
        ${rest.length ? `<section class="col">${soon.length ? '<h2>עוד מחכות לך</h2>' : ''}${rest.map(K.giftCard).join('')}</section>` : ''}
        ${!w.active.length ? `<div class="card cream center col" style="padding:28px"><div style="font-size:44px">🎁</div><h2>עוד אין כאן מתנות</h2><p class="muted" style="margin:0">אבל הכול חוזר 😉</p></div>` : ''}
`
        : `<div class="col">${w.used.map(K.giftCard).join('') || '<p class="muted center">עוד לא מימשת כלום.</p>'}</div>`}`, { nav: 'wallet' });
    K.on('[data-t]', 'click', (e) => K.go('wallet?tab=' + e.currentTarget.dataset.t));
  });

  // ───────── redeem at the counter (live screen) ─────────
  let timer = null;
  K.route('redeem', (id) => {
    clearInterval(timer);
    const g = A().gift(id);
    if (!g || g.to !== 'me') return K.go('wallet');
    if (g.status !== 'active') return done(g);
    const p = g.product, b = p.biz;
    K.render(`
      ${K.header(esc(b.name), { close: true })}
      ${b.paused ? '<div class="warn center">העסק סגור זמנית. המתנה מחכה לך.</div>' : ''}
      <div class="live">
        <div class="row" style="gap:8px;margin-top:6px"><span style="font-size:30px">${p.emoji}</span><b style="font-size:20px">${esc(p.name)}</b></div>
        <div class="qrbox">${K.qrSVG(g.code)}<span class="scan"></span></div>
        <div class="code" aria-label="קוד ידני">${g.code.slice(0, 3)}-${g.code.slice(3)}</div>
        <div class="clock"><span class="pulse"></span><span id="clk"></span></div>
        <span class="micro muted">המסך חי. צילום מסך לא עובר בקופה.</span>
      </div>
      <button class="btn lime" id="pin">מסירה לצוות · הקלדת קוד העסק</button>
      <div class="list">
        <div><span>🧾</span><span class="grow"><b>מה כלול:</b> ${esc(p.includes)}</span></div>
        <div><span>📍</span><span class="grow">${esc(b.address)}</span></div>
        <div><span>🕐</span><span class="grow">${esc(b.hours)}</span></div>
        <div><span>📅</span><span class="grow">בתוקף עד ${K.dateShort(g.expiresAt)}</span></div>
        <div><span>💝</span><span class="grow">מ${esc(g.fromP.name)} · ${K.sourceText(g)}</span></div>
      </div>`, { theme: 'dark' });
    K.wireBack('wallet');
    const clk = document.getElementById('clk');
    const tick = () => { if (!document.body.contains(clk)) return clearInterval(timer); clk.textContent = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
    tick(); timer = setInterval(tick, 1000);
    K.on('#pin', 'click', () => pinPad(g));
  });

  function pinPad(g) {
    let pin = '';
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    const paint = (err) => {
      bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="קוד העסק"><button class="sheet-x" data-close aria-label="סגירה">${K.ICON.close}</button>
        <h2 class="center">לצוות של ${esc(g.product.biz.name)}</h2>
        <p class="center small" style="margin:0">מקלידים את הקוד של העסק (4 ספרות) כדי לסמן ש${esc(g.product.name)} נמסר.</p>
        <div class="pindots" aria-live="polite" aria-label="${pin.length} ספרות">${[0, 1, 2, 3].map((i) => `<i class="${i < pin.length ? 'on' : ''}"></i>`).join('')}</div>
        ${err ? `<div class="warn center">${esc(err)}</div>` : ''}
        <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((n) => n === '' ? '<span></span>' : `<button data-n="${n}" aria-label="${n === '⌫' ? 'מחיקה' : n}">${n}</button>`).join('')}</div>
        <p class="micro muted center" style="margin:0">בהדגמה הקוד של ${esc(g.product.biz.name)} הוא ${g.product.biz.pin}</p>
        <button class="btn ghost" data-close>ביטול</button></div>`;
    };
    paint();
    document.body.appendChild(bg);
    bg.addEventListener('click', async (e) => {
      if (e.target === bg || e.target.closest('[data-close]')) return bg.remove();
      const b = e.target.closest('[data-n]'); if (!b) return;
      const n = b.dataset.n;
      pin = n === '⌫' ? pin.slice(0, -1) : (pin + n).slice(0, 4);
      paint();
      if (pin.length === 4) {
        try { await A().redeem(g.id, pin); bg.remove(); done(A().gift(g.id), true); }
        catch (err) { pin = ''; paint(K.errText(err)); }
      }
    });
  }

  function done(g, fresh) {
    clearInterval(timer);
    const t = new Date(g.redeemedAt);
    K.render(`
      <div class="col center" style="gap:14px;margin-top:40px">
        <div class="stamp" style="font-size:44px">מומש ✓</div>
        <div style="font-size:64px">${g.product.emoji}</div>
        <h1>${esc(g.product.name)}</h1>
        <p class="small" style="margin:0">${esc(g.product.biz.name)} · ${t.toLocaleDateString('he-IL')} ${t.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
        ${fresh ? '<h2>בתיאבון! 😋</h2>' : ''}
      </div>
      <div class="stack-bottom">
        <a class="btn pink" href="#/new-karma?to=${g.from}&occ=thanks">לשלוח תודה ל${esc(g.fromP.name)} 💌</a>
        <a class="btn ghost" href="#/wallet">למתנות שלי</a>
      </div>`, { theme: 'lime' });
  }
})();
