// התערבויות: create, challenge received, result, loser pays.
(function () {
  const esc = K.esc;
  const A = () => K.api;
  const STAKES = [{ id: 'honor', emoji: '', name: 'על הכבוד' }, { id: 'p-coffee', emoji: '', name: 'קפה' }, { id: 'p-ice', emoji: '', name: 'גלידה' }];

  K.route('new-bet', () => {
    const st = { to: K.q.get('to') || null, cat: null, topic: '', me: '', them: '', stake: 'honor', when: 'week', date: '' };
    const draw = () => {
      const f = st.to && A().friend(st.to);
      const ready = f && st.topic.trim() && st.me.trim() && st.them.trim() && (st.when !== 'date' || st.date);
      K.render(`
        ${K.header('התערבות ', { close: true })}
        <section class="col"><h3>עם מי?</h3>${K.friendPicker(st.to)}</section>
        <section class="col"><h3>על מה?</h3>
          <div class="wrap">${A().BET_CATS.map((c) => `<button class="chip" data-c="${c.id}" aria-pressed="${st.cat === c.id}">${c.emoji} ${c.name}</button>`).join('')}</div>
          <input class="input" id="topic" maxlength="60" placeholder="מי ינצח בדרבי?" value="${esc(st.topic)}"></section>
        <section class="col"><h3>מי על מה?</h3>
          <div class="vs"><label class="side me"><span class="micro">${K.U('הצד שלך', 'הצד שלך', 'הצד שלך')}</span><input class="input" id="me" maxlength="24" value="${esc(st.me)}" style="height:42px;text-align:center"></label>
          <span class="x">VS</span>
          <label class="side"><span class="micro">${f ? esc(f.name) : 'החבר'}</span><input class="input" id="them" maxlength="24" value="${esc(st.them)}" style="height:42px;text-align:center"></label></div></section>
        <section class="col"><h3>על מה מתערבים?</h3>
          <div class="grid3">${STAKES.map((s) => { const p = s.id !== 'honor' && A().product(s.id); return `<button class="spice" data-s="${s.id}" aria-pressed="${st.stake === s.id}" style="height:78px"><span style="font-size:26px">${s.emoji}</span><span>${s.name}</span>${p ? `<span class="micro">${K.money(p.price)}</span>` : ''}</button>`; }).join('')}</div>
          ${st.stake !== 'honor' ? `<p class="micro muted" style="margin:0">מי שמפסיד שולח ${A().product(st.stake).name} אמיתי מ${esc(A().product(st.stake).biz.name)}. לא כסף, רק מתנה.</p>` : ''}</section>
        <section class="col"><h3>עד מתי?</h3>
          <div class="wrap">${[['today', 'היום'], ['tomorrow', 'מחר'], ['week', 'עד סוף השבוע'], ['date', 'תאריך']].map(([k, t]) => `<button class="chip" data-w="${k}" aria-pressed="${st.when === k}">${t}</button>`).join('')}</div>
          ${st.when === 'date' ? `<input class="input" type="date" id="date" value="${st.date}">` : ''}</section>
        <div class="warn" id="mw" hidden></div>
        <div class="stack-bottom"><button class="btn lime" id="send" ${ready ? '' : 'disabled'}>לזרוק כפפה</button></div>`);
      K.wireBack('accounts?t=bets');
      K.wirePicker((fid) => { st.to = fid; draw(); });
      K.on('[data-c]', 'click', (e) => { st.cat = e.currentTarget.dataset.c; draw(); });
      K.on('[data-s]', 'click', (e) => { st.stake = e.currentTarget.dataset.s; draw(); });
      K.on('[data-w]', 'click', (e) => { st.when = e.currentTarget.dataset.w; draw(); });
      const sync = () => {
        ['topic', 'me', 'them'].forEach((k) => { st[k] = document.getElementById(k).value; });
        const d = document.getElementById('date'); if (d) st.date = d.value;
        const bad = K.modWarn(document.getElementById('mw'), `${st.topic} ${st.me} ${st.them}`);
        document.getElementById('send').disabled = !(f && st.topic.trim() && st.me.trim() && st.them.trim() && (st.when !== 'date' || st.date)) || !!bad;
      };
      ['topic', 'me', 'them', 'date'].forEach((k) => { const el = document.getElementById(k); if (el) el.addEventListener('input', sync); });
      K.on('#send', 'click', async () => {
        const now = new Date();
        const deadline = st.when === 'today' ? new Date(now.setHours(23, 59)) : st.when === 'tomorrow' ? new Date(Date.now() + 864e5) : st.when === 'week' ? new Date(Date.now() + ((6 - new Date().getDay() + 7) % 7 || 7) * 864e5) : new Date(st.date + 'T20:00');
        try {
          const b = await A().newBet({ to: st.to, cat: st.cat || 'other', topic: st.topic.trim(), sideFrom: st.me.trim(), sideTo: st.them.trim(), stake: st.stake === 'honor' ? 'honor' : 'gift', productId: st.stake === 'honor' ? null : st.stake, deadline: deadline.toISOString() });
          if (f.invited) K.shareWA(`כפפה מ${A().me().name} ${st.topic}\n${K.link('plain')}`);
          K.toast(`הכפפה נזרקה ל${f.name}`); K.go('bet/' + b.id);
        } catch (e) { K.toast(K.errText(e)); }
      });
    };
    draw();
  });

  const vs = (b) => `<div class="vs">
    <div class="side me">${K.av(A().me(), 'sm')}<span>${esc(b.mySide)}</span></div><span class="x">VS</span>
    <div class="side">${K.av(b.friend, 'sm')}<span>${esc(b.theirSide)}</span></div></div>`;
  const stakeLine = (b) => b.stake === 'gift' ? `<span class="pill lime">${b.product.emoji} על ${esc(b.product.name)}</span>` : '<span class="pill"> על הכבוד</span>';

  K.route('bet', (id) => {
    const b = A().bet(id);
    if (!b) return K.go('accounts?t=bets');
    const f = b.friend;
    const past = new Date(b.deadline) < new Date();

    // challenge received: full-screen moment, yes / no only
    if (b.status === 'pending' && b.to === 'me') {
      K.render(`
        <div class="col center" style="gap:8px">${K.av(f, 'xl')}<h1>${esc(f.name)} ${K.gv(f, 'זרקה', 'זרק')} לך כפפה</h1><span class="small">${K.timeAgo(b.createdAt)}</span></div>
        <div class="sticker center"><span class="big-reason">${esc(b.topic)}</span></div>
        ${vs(b)}
        <div class="row" style="justify-content:center;flex-wrap:wrap">${stakeLine(b)}<span class="pill"> עד ${K.dateShort(b.deadline)}</span></div>
        <div class="stack-bottom"><button class="btn" id="in">אני בפנים</button><button class="btn md white" id="out">לא הפעם</button></div>`,
      { theme: 'lime', moment: { close: '', share: () => K.shareStory({ bg: 'lime', kicker: 'CHALLENGE ', title: b.topic, card: { lines: [`${b.mySide} VS ${b.theirSide}`, b.stake === 'gift' ? `על ${b.product.name} ${b.product.emoji}` : 'על הכבוד '] } }, 'bet') } });
      K.on('#in', 'click', async () => { await A().respondBet(id, true); K.toast('יאללה'); K.routeNow(); });
      K.on('#out', 'click', async () => { await A().respondBet(id, false); K.go('accounts?t=bets'); });
      return;
    }
    // I lost a gift bet and haven't paid
    if (b.status === 'lost' && !b.giftId) {
      const p = b.product;
      K.render(`
        <div class="col center" style="gap:10px;margin-top:20px"><div style="font-size:64px"></div><h1>הפסדת</h1><p style="margin:0">${esc(f.name)} ${K.gv(f, 'ניצחה', 'ניצח')} ב"${esc(b.topic)}"</p></div>
        <div class="card row"><span style="font-size:36px">${p.emoji}</span><div style="flex:1"><b>${esc(p.name)} ל${esc(f.name)}</b><div class="small">${esc(p.biz.name)} · ${K.money(p.price)}</div></div></div>
        ${b.remindedAt ? `<p class="center small" style="margin:0">${esc(f.name)} עדיין ${K.gv(f, 'מחכה', 'מחכה')} ל${esc(p.name)} ${K.gv(f, 'שלה', 'שלו')} ${p.emoji}</p>` : ''}
        <div class="stack-bottom"><button class="btn lime" id="pay">לשלוח ל${esc(f.name)} ${p.emoji}</button>${b.remindedAt ? '' : '<button class="btn ghost" id="later">אחר כך</button>'}</div>`, { theme: 'lav', moment: { close: 'accounts?t=bets' } });
      K.on('#pay', 'click', async () => {
        if (!(await K.pay(p.price, `${p.emoji} ${p.name} · ${p.biz.name}`))) return;
        await A().payBet(id); K.toast(`${p.name} בדרך ל${f.name} ${p.emoji}`); K.routeNow();
      });
      K.on('#later', 'click', async () => { await A().remindLater(id); K.toast('נזכיר מחר. בעדינות'); K.go(''); });
      return;
    }
    // won / done
    if (b.status === 'done' && b.winner) {
      const won = b.winner === 'me';
      K.render(`
        <div class="col center" style="gap:10px;margin-top:10px"><div style="font-size:64px">${won ? '' : ''}</div><h1>${won ? 'ניצחת!' : 'הפסדת. כבוד ששילמת '}</h1><p style="margin:0">${esc(b.topic)}</p></div>
        ${vs(b)}
        <div class="row" style="justify-content:center">${stakeLine(b)}</div>
        ${won && b.stake === 'honor' ? '<p class="center h3" style="margin:0">על הכבוד. וזה הכי שווה.</p>' : ''}
        ${won && b.stake === 'gift' ? (b.giftId ? `<a class="card lime row" href="#/wallet" style="text-decoration:none"><span style="font-size:30px">${b.product.emoji}</span><b style="flex:1">${esc(b.product.name)} מחכה לך ב"המתנות שלי"</b>${K.ICON.fwd}</a>` : `<div class="note center">${esc(f.name)} ${K.gv(f, 'צריכה', 'צריך')} לשלוח לך ${esc(b.product.name)} ${b.product.emoji}</div>`) : ''}
        <div class="stack-bottom">${won ? '<button class="btn md white" id="share">⤴ לסטורי</button>' : ''}<a class="btn ghost" href="#/accounts?t=bets">לכל ההתערבויות</a></div>`,
      { theme: won ? 'lime' : '', moment: { close: 'accounts?t=bets', share: won ? share : null } });
      function share() { K.shareStory({ bg: 'lime', kicker: 'WINNER ', title: b.topic, card: { lines: [`${A().me().name} `, `נגד ${f.name}`] }, sub: b.stake === 'honor' ? 'על הכבוד.' : '' }, 'win'); }
      K.on('#share', 'click', share);
      return;
    }
    // everything else: pending (mine), active, disputed, declined
    let body = '';
    if (b.status === 'pending') body = `<div class="note center">מחכים ש${esc(f.name)} ${K.gv(f, 'תענה', 'יענה')}…</div>`;
    else if (b.status === 'declined') body = `<div class="note center">${esc(f.name)}: לא הפעם.</div>`;
    else if (b.status === 'active' || b.status === 'disputed') {
      body = `${b.status === 'disputed' ? `<div class="warn center">לא מסכימים דברו על זה, ואז מסמנים שוב.</div>` : `<p class="center small" style="margin:0">${past ? 'נגמר הזמן ' : ` עד ${K.dateShort(b.deadline)}`}. כל אחד מסמן מי ניצח. אם מסכימים, נסגר.</p>`}
        <h2 class="center">מי ניצח?</h2>
        <div class="row"><button class="btn lime" data-w="me" style="flex:1">${K.U('אני', 'אני', 'אני')}</button><button class="btn white" data-w="${f.id}" style="flex:1">${esc(f.name)}</button></div>
        ${b.status === 'active' ? '<button class="link muted micro" id="dispute">הדגמה: מה קורה כשלא מסכימים?</button>' : ''}`;
    }
    K.render(`
      ${K.header('התערבות ', { close: true })}
      <div class="sticker center"><span class="micro">${b.catP ? b.catP.emoji + ' ' + b.catP.name : ''}</span><span class="big-reason">${esc(b.topic)}</span></div>
      ${vs(b)}
      <div class="row" style="justify-content:center;flex-wrap:wrap">${stakeLine(b)}<span class="pill">נפתח ${K.timeAgo(b.createdAt)}</span></div>
      ${body}`);
    K.wireBack('accounts?t=bets');
    K.on('[data-w]', 'click', async (e) => {
      const r = await A().claimBet(id, e.currentTarget.dataset.w);
      if (r.status === 'disputed') K.toast('לא מסכימים');
      K.routeNow();
    });
    K.on('#dispute', 'click', async () => { await A().disputeDemo(id); K.routeNow(); });
  });
})();
