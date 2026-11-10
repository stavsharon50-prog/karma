// Business side: QR landing at the shop, owner dashboard & settings, sticker, staff guide, onboarding tool.
(function () {
  const esc = K.esc;
  const A = () => K.api;
  const bizId = () => K.q.get('id') || K.state.bizId || 'biz-lotus';

  // ───────── QR landing: c/<slug> ─────────
  K.route('c', (slug) => {
    const b = A().business(slug);
    if (!b) return K.render(`<div class="loading col center"><h2>העסק לא נמצא</h2><a class="btn md" href="#/">ל-KARMA.</a></div>`);
    const st = K.state.qr && K.state.qr.slug === slug ? K.state.qr : (K.state.qr = { slug, pid: null, to: null, waName: '', why: 'good', occ: 'miss', beefId: null, msg: '' });
    const signed = A().signedIn();
    const draw = () => {
      const p = st.pid && b.products.find((x) => x.id === st.pid);
      const onMe = signed ? A().openBeefsOnMe() : [];
      const smart = onMe.find((x) => x.friend) || null;
      const f = st.to && A().friend(st.to);
      const beefsWith = f ? onMe.filter((x) => x.from === f.id) : [];
      const toName = f ? f.name : st.waName.trim();
      const ready = p && toName && (st.why === 'good' || st.beefId);
      K.render(`
        <div class="row between">${K.logo()}<span class="pill">📍 ${esc(b.name)}</span></div>
        <div class="card ${b.color || 'peach'} row"><span style="font-size:40px">${b.emoji}</span><div style="flex:1"><h2>${esc(b.name)}</h2><div class="small">${esc(b.address)}</div><div class="micro">${esc(b.hours)}</div></div></div>
        ${b.paused ? '<div class="warn center">סגור זמנית. אפשר לחזור בקרוב 🙏</div>' : `
        <h1>מגיע למישהו משהו?</h1>
        ${smart && !st.to ? `<button class="card lav row" id="smart" style="text-align:right;width:100%"><span style="font-size:28px">😈</span><span style="flex:1"><b>ל${esc(smart.friend.name)} יש ביף פתוח איתך</b><br><span class="small">"${esc(smart.reason)}". לסגור את זה מכאן?</span></span>${K.ICON.fwd}</button>` : ''}
        <section class="col"><h3>מה שולחים?</h3><div class="col" style="gap:10px">${b.products.map((x) => K.prodCard(Object.assign({}, x, { biz: b }), { on: st.pid === x.id })).join('')}</div></section>
        <section class="col"><h3>למי?</h3>
          ${signed ? K.friendPicker(st.to, { invite: false }) : ''}
          <input class="input" id="wa" placeholder="${signed ? 'או שם של מישהו שעוד לא ב-KARMA.' : 'השם של מי שמקבל'}" value="${esc(st.waName)}" maxlength="20">
          ${!f && st.waName.trim() ? '<p class="micro muted" style="margin:0">💬 נשלח לו הזמנה בוואטסאפ עם המתנה.</p>' : ''}</section>
        <section class="col"><h3>למה?</h3>
          <div class="seg"><button data-why="good" aria-pressed="${st.why === 'good'}">😇 גוד קארמה</button><button data-why="beef" aria-pressed="${st.why === 'beef'}">😈 לסגור ביף</button></div>
          ${st.why === 'good' ? `<div class="wrap">${A().OCCASIONS.map((o) => `<button class="chip" data-o="${o.id}" aria-pressed="${st.occ === o.id}">${o.emoji} ${o.name}</button>`).join('')}</div>`
            : beefsWith.length ? beefsWith.map((x) => `<button class="opt" data-beef="${x.id}" aria-pressed="${st.beefId === x.id}"><span class="em">😈</span><span style="flex:1"><span class="t">${esc(x.reason)}</span><br><span class="s">${K.timeAgo(x.createdAt)} · ${'🌶'.repeat(x.spice)}</span></span></button>`).join('')
            : `<p class="small muted" style="margin:0">${f ? `אין ביף פתוח עם ${esc(f.name)}. אולי גוד קארמה? 😇` : 'ביף אפשר לסגור רק עם חבר ב-KARMA.'}</p>`}
          ${st.why === 'good' ? `<input class="input" id="msg" placeholder="כמה מילים (לא חובה)" maxlength="120" value="${esc(st.msg)}"><div class="warn" id="mw" hidden></div>` : ''}
        </section>
        <div class="stack-bottom">
          <button class="btn lime" id="go" ${ready ? '' : 'disabled'}>${p ? `להמשיך · ${K.money(p.price)}` : 'בוחרים מה שולחים'}</button>
          ${!signed ? '<p class="micro muted center" style="margin:0">כניסה עם Google רגע לפני התשלום. בלי הרשמה ארוכה.</p>' : ''}
        </div>`}`);
      K.on('#smart', 'click', () => { Object.assign(st, { to: smart.friend.id, why: 'beef', beefId: smart.id, pid: st.pid || (b.products[0] || {}).id }); draw(); });
      K.on('.prod', 'click', (e) => { st.pid = e.currentTarget.dataset.pid; draw(); });
      K.on('.friend-pick[data-fid]', 'click', (e) => { st.to = e.currentTarget.dataset.fid; st.waName = ''; st.beefId = null; draw(); });
      K.on('[data-why]', 'click', (e) => { st.why = e.currentTarget.dataset.why; draw(); });
      K.on('[data-o]', 'click', (e) => { st.occ = e.currentTarget.dataset.o; draw(); });
      K.on('[data-beef]', 'click', (e) => { st.beefId = e.currentTarget.dataset.beef; draw(); });
      const wa = document.getElementById('wa');
      if (wa) { wa.addEventListener('input', () => { st.waName = wa.value; if (wa.value) st.to = null; document.getElementById('go').disabled = !(p && (wa.value.trim() || f) && (st.why === 'good' || st.beefId)); }); wa.addEventListener('change', draw); }
      const m = document.getElementById('msg');
      if (m) m.addEventListener('input', () => { st.msg = m.value; K.modWarn(document.getElementById('mw'), m.value); });
      K.on('#go', 'click', async () => {
        if (st.msg && K.modWarn(null, st.msg)) return K.toast(K.MOD_MSG[K.modWarn(null, st.msg)]);
        if (!A().signedIn()) { if (!(await K.google())) return; A().setOnboarded(); }
        if (!(await K.pay(p.price, `${p.emoji} ${p.name} · ${b.name}`))) return;
        try {
          let to = st.to;
          if (!to) to = (await A().inviteFriend(st.waName.trim())).id;
          if (st.why === 'beef') { await A().settleWithGift(st.beefId, p.id); K.state.qr = null; return K.go('closed/' + st.beefId); }
          const k = await A().sendKarma({ to, occasion: st.occ, message: st.msg.trim(), productId: p.id });
          K.state.qr = null; doneQR(b, p, A().friend(to), k);
        } catch (e) { K.toast(K.errText(e)); }
      });
    };
    draw();
  });
  function doneQR(b, p, f, k) {
    K.render(`
      <div class="col center" style="gap:12px;margin-top:36px"><div style="font-size:64px">${p.emoji}</div><h1>נשלח! 🎉</h1>
        <p style="margin:0">${esc(p.name)} מ${esc(b.name)} מחכה ל${esc(f.name)}.</p></div>
      <div class="stack-bottom">
        ${f.invited ? `<button class="btn" id="wa">${K.ICON.wa}<span>לשלוח ל${esc(f.name)} בוואטסאפ</span></button>` : `<p class="center small">${esc(f.name)} ${K.gv(f, 'קיבלה', 'קיבל')} התראה עכשיו 😇</p>`}
        <a class="btn md white" href="#/">ל-KARMA. ›</a>
      </div>`, { theme: 'pink' });
    K.on('#wa', 'click', () => K.shareWA(K.inviteText('karma')));
  }

  // ───────── owner dashboard: biz[/settings|sticker|guide] ─────────
  K.route('biz', (sub) => {
    K.state.bizId = bizId();
    if (sub === 'settings') return settings();
    if (sub === 'sticker') return sticker();
    if (sub === 'guide') return guide();
    const d = A().bizDashboard(K.state.bizId), b = d.biz;
    const firstMonth = Date.now() - new Date(b.joined) < 30 * 864e5;
    const waiting = Object.entries(d.waiting).map(([pid, n]) => { const p = A().product(pid); return p ? `${n} ${p.name} ${p.emoji}` : ''; }).filter(Boolean);
    K.render(`
      <div class="row between"><div class="row" style="gap:8px"><span style="font-size:30px">${b.emoji}</span><div><h2>${esc(b.name)}</h2><span class="micro muted">הלוח של העסק · ${new Date().toLocaleString('he-IL', { month: 'long' })}</span></div></div>
        <a class="icon-btn" href="#/biz/settings" aria-label="הגדרות">⚙️</a></div>
      ${b.paused ? '<div class="warn center">⏸ העסק מושהה. מתנות קיימות עדיין בתוקף.</div>' : ''}
      <div class="kpis">
        <div class="kpi"><b>${d.sold}</b><span>נמכרו החודש</span></div>
        <div class="kpi"><b>${d.redeemed}</b><span>מומשו</span></div>
      </div>
      <div class="card lime col">
        <div class="row between"><b>💰 מגיע לך</b><b class="display" style="font-size:30px">${K.money(firstMonth ? d.gross : d.due)}</b></div>
        <div class="small">${firstMonth ? 'חודש ראשון בלי עמלה 🎉' : `מכירות ${K.money(d.gross)} · עמלת KARMA. 10% (${K.money(d.fee)})`}</div>
        <div class="micro">העברה הבאה: ${K.dateShort(d.nextPayout)} · הכסף שלך מרגע המכירה (אחרי 24 שעות לביטול)</div>
      </div>
      <div class="kpis">
        <div class="kpi"><b>🆕 ${d.newCustomers}</b><span>לקוחות חדשים</span></div>
        <div class="kpi"><b>🎁 ${Object.values(d.waiting).reduce((a, n) => a + n, 0)}</b><span>מתנות בדרך אליכם</span></div>
      </div>
      ${waiting.length ? `<p class="small" style="margin:0">בדרך אליכם: ${waiting.join(' · ')}</p>` : ''}
      <section class="col"><h2>מימושים אחרונים</h2>
        <div class="list">${d.recent.map((s) => `<div><span>${s.product.emoji}</span><span class="grow">${esc(s.product.name)}</span><span class="micro muted">${K.timeAgo(s.redeemedAt)}</span></div>`).join('') || '<div class="muted">עוד אין.</div>'}</div>
        <p class="micro muted" style="margin:0">🔒 בלי שמות לקוחות. רק מה מומש ומתי.</p></section>
      <div class="grid2">
        <a class="btn md white" href="#/biz/settings">⚙️ הגדרות ומוצרים</a>
        <a class="btn md white" href="#/biz/sticker">🏷 מדבקת QR</a>
        <a class="btn md white" href="#/biz/guide">⏱ מדריך לצוות</a>
        <a class="btn md white" href="https://wa.me/?text=${encodeURIComponent('היי, צריך עזרה עם KARMA.')}" target="_blank" rel="noopener">${K.ICON.wa}<span>תמיכה</span></a>
      </div>
      <a class="link muted micro" href="#/profile">חזרה לאפליקציה (הדגמה)</a>`);
  });

  function settings() {
    const b = A().business(K.state.bizId);
    K.render(`
      ${K.header('הגדרות העסק')}
      <section class="col"><div class="sec"><h2>מוצרים</h2><span class="micro muted">${b.products.length}/3</span></div>
        ${b.products.map((p) => `<div class="card col" data-p="${p.id}">
          <div class="row"><input class="input" data-k="emoji" value="${esc(p.emoji)}" style="width:60px;text-align:center" maxlength="2" aria-label="אימוג׳י"><input class="input" data-k="name" value="${esc(p.name)}" aria-label="שם"></div>
          <input class="input" data-k="includes" value="${esc(p.includes)}" aria-label="מה כלול">
          <div class="row"><label class="field" style="flex:1">מחיר ₪<input class="input" data-k="price" type="number" min="5" value="${p.price}"></label>
          <button class="btn md white" data-del="${p.id}" style="width:auto;margin-top:20px">להוריד</button></div></div>`).join('')}
        ${b.products.length < 3 ? '<button class="btn md white" id="addp">+ מוצר</button>' : ''}
        <p class="micro muted" style="margin:0">שינויים עולים מיד. מחיר חדש חל רק על מתנות חדשות.</p></section>
      <section class="col"><h2>פרטים</h2>
        <label class="field">כתובת<input class="input" data-b="address" value="${esc(b.address)}"></label>
        <label class="field">שעות<input class="input" data-b="hours" value="${esc(b.hours)}"></label>
        <label class="field">טלפון<input class="input" data-b="phone" value="${esc(b.phone || '')}" inputmode="tel"></label></section>
      <section class="col"><h2>קוד העסק</h2>
        <div class="row between card"><span>הקוד שהצוות מקליד במימוש</span><b class="code" style="font-size:22px">${b.pin}</b></div>
        <button class="btn md white" id="pin">להחליף קוד</button>
        <p class="micro muted" style="margin:0">כדאי להחליף אם מישהו שעזב ידע אותו. כל המימושים נשמרים ביומן.</p></section>
      <section class="col"><h2>השהיה</h2>
        <div class="list"><div><span class="grow"><b>להשהות את העסק</b><br><span class="micro muted">לא יימכרו מתנות חדשות. מתנות קיימות נשארות בתוקף.</span></span><button class="toggle" role="switch" id="pause" aria-checked="${!!b.paused}" aria-label="השהיה"></button></div></div></section>
      <section class="col"><h2>תשלומים</h2>
        <div class="list"><div><span>🏦</span><span class="grow">חשבון ••• 4411<br><span class="micro muted">מנוהל אצל ספק הסליקה. העברה פעם בחודש.</span></span></div>
        <div><span>%</span><span class="grow">עמלה 10% מכל מכירה · עמלות כרטיס על העסק</span></div></div></section>`);
    K.wireBack('biz');
    K.on('[data-p] input', 'change', async (e) => {
      const card = e.target.closest('[data-p]'); const k = e.target.dataset.k;
      const v = k === 'price' ? Math.max(5, +e.target.value || 5) : e.target.value.trim();
      await A().updateProduct(b.id, card.dataset.p, { [k]: v }); K.toast('עודכן ✓ כבר באוויר');
    });
    K.on('[data-del]', 'click', async (e) => { if (await K.confirm('להוריד את המוצר?', 'מתנות שכבר נקנו נשארות בתוקף.', 'להוריד')) { await A().updateProduct(b.id, e.currentTarget.dataset.del, null); K.routeNow(); } });
    K.on('#addp', 'click', async () => { const s = A().BIZ_TYPES[b.type].suggest.find((x) => !b.products.some((p) => p.name === x[1])) || ['🎁', 'מוצר חדש', '', 20]; await A().updateProduct(b.id, 'new', { emoji: s[0], name: s[1], includes: s[2], price: s[3] }); K.routeNow(); });
    K.on('[data-b]', 'change', async (e) => { await A().updateBusiness(b.id, { [e.target.dataset.b]: e.target.value.trim() }); K.toast('נשמר ✓'); });
    K.on('#pin', 'click', async () => { const pin = String(1000 + Math.floor(Math.random() * 9000)); await A().updateBusiness(b.id, { pin }); K.toast(`הקוד החדש: ${pin}`); K.routeNow(); });
    K.on('#pause', 'click', async (e) => { const v = e.currentTarget.getAttribute('aria-checked') !== 'true'; await A().updateBusiness(b.id, { paused: v }); K.toast(v ? 'העסק מושהה ⏸' : 'חזרתם לפעול ▶'); K.routeNow(); });
  }

  const stickerHTML = (b) => `<div class="sticker-print">
    <div class="q">מגיע למישהו ${b.products[0] ? esc(b.products[0].name) : 'משהו'}? ${b.emoji}<br>או שיש לך ביף לסגור? 😈</div>
    <div class="qrbox" style="width:180px;height:180px">${K.qrSVG(b.slug)}</div>
    <div class="h3">שולחים מכאן</div>${K.logo()}
    <div class="micro muted ltr">${esc(location.host + location.pathname)}#/c/${esc(b.slug)}</div></div>`;
  function sticker() {
    const b = A().business(K.state.bizId);
    K.render(`${K.header('מדבקת QR')}
      ${stickerHTML(b)}
      <button class="btn" onclick="window.print()">להדפיס 🖨</button>
      <a class="btn md white" href="#/c/${b.slug}">לנסות: מה הלקוח רואה ›</a>
      <p class="micro muted center" style="margin:0">מדביקים ליד הקופה או על השולחנות.</p>`);
    K.wireBack('biz');
  }
  function guide() {
    const b = A().business(K.state.bizId);
    K.render(`${K.header('מדריך לצוות · דקה')}
      <div class="steps-n">
        <div><span><b>לקוח מראה מסך עם QR שזז</b><br><span class="small">המסך חי: שעון שרץ ופס צבעוני. צילום מסך לא עובר.</span></span></div>
        <div><span><b>בודקים מה כלול</b><br><span class="small">כתוב על המסך, למשל "${b.products[0] ? esc(b.products[0].includes) : 'קפה בגודל רגיל'}".</span></span></div>
        <div><span><b>מקלידים את קוד העסק בטלפון של הלקוח</b><br><span class="small">4 ספרות. הקוד אצל המנהל.</span></span></div>
        <div><span><b>מופיע "מומש ✓" ומגישים</b><br><span class="small">זהו. הכסף כבר שולם, ומגיע אליכם בהעברה החודשית.</span></span></div>
      </div>
      <div class="card lav small">❓ קוד לא עובד? מתנה שפג תוקפה? כותבים לנו בוואטסאפ ועונים מהר.</div>`);
    K.wireBack('biz');
  }

  // ───────── onboarding tool (for the founder, in person) ─────────
  K.route('admin', (sub) => {
    if (sub === 'new') return wizard();
    const all = A().businesses(true);
    K.render(`
      ${K.header('צירוף עסקים')}
      <a class="btn lime" href="#/admin/new">+ עסק חדש</a>
      <div class="col">${all.map((b) => `<div class="beef">${`<span class="av ${b.color || 'peach'}" aria-hidden="true">${b.emoji}</span>`}<span class="body"><span class="reason">${esc(b.name)}</span><span class="meta">${A().BIZ_TYPES[b.type].name} · ${b.products.length} מוצרים · ${esc(b.address)}</span></span>
        ${!b.approved ? `<button class="btn md" data-ok="${b.id}" style="width:auto">לאשר</button>` : b.paused ? '<span class="pill lav">מושהה</span>' : `<a class="pill lime" href="#/biz?id=${b.id}" style="text-decoration:none">פעיל ›</a>`}</div>`).join('')}</div>
      <p class="micro muted" style="margin:0">כל עסק מאושר ידנית. בהדגמה הכול נשמר רק בטלפון הזה.</p>`);
    K.wireBack('profile');
    K.on('[data-ok]', 'click', async (e) => { await A().approveBusiness(e.currentTarget.dataset.ok); K.toast('העסק באוויר 🎉'); K.routeNow(); });
  });

  function wizard() {
    const w = K.state.wiz || (K.state.wiz = { step: 1, name: '', type: 'cafe', address: '', hours: '', phone: '', products: null, taxId: '', bank: '', terms: false });
    const T = A().BIZ_TYPES;
    if (!w.products) w.products = T[w.type].suggest.map((s, i) => ({ on: i < 2, emoji: s[0], name: s[1], includes: s[2], price: s[3] }));
    const steps = ['פרטים', 'מוצרים', 'תשלום', 'תנאים', 'ערכה'];
    let body = '';
    if (w.step === 1) body = `
      <label class="field">שם העסק<input class="input" data-w="name" value="${esc(w.name)}"></label>
      <div class="field">סוג<div class="wrap">${Object.entries(T).map(([k, t]) => `<button class="chip" data-type="${k}" aria-pressed="${w.type === k}">${t.emoji} ${t.name}</button>`).join('')}</div></div>
      <label class="field">כתובת<input class="input" data-w="address" value="${esc(w.address)}"></label>
      <label class="field">שעות פתיחה<input class="input" data-w="hours" value="${esc(w.hours)}" placeholder="א׳–ה׳ 8:00–20:00"></label>
      <label class="field">טלפון<input class="input" data-w="phone" value="${esc(w.phone)}" inputmode="tel"></label>
      <div class="field">לוגו<button class="btn md white" type="button" id="logo">📷 לצלם או להעלות</button></div>`;
    if (w.step === 2) body = `
      <p class="small" style="margin:0">עד 3 מוצרים. הצעות לפי ${T[w.type].name}:</p>
      ${w.products.map((p, i) => `<div class="card col ${p.on ? '' : 'flat'}" style="${p.on ? '' : 'opacity:.6'}">
        <label class="row"><input type="checkbox" data-on="${i}" ${p.on ? 'checked' : ''} style="width:22px;height:22px"><span style="font-size:24px">${p.emoji}</span><input class="input" data-pi="${i}" data-k="name" value="${esc(p.name)}"></label>
        <input class="input" data-pi="${i}" data-k="includes" value="${esc(p.includes)}" placeholder="מה כלול">
        <label class="field">מחיר ₪<input class="input" type="number" data-pi="${i}" data-k="price" value="${p.price}"></label></div>`).join('')}`;
    if (w.step === 3) body = `
      <label class="field">ח.פ / עוסק מורשה<input class="input" data-w="taxId" value="${esc(w.taxId)}" inputmode="numeric"></label>
      <label class="field">חשבון בנק להעברות<input class="input" data-w="bank" value="${esc(w.bank)}" placeholder="בנק · סניף · חשבון"></label>
      <div class="note">🔒 בגרסה האמיתית הפרטים האלה נמסרים ישירות לספק הסליקה, לא נשמרים אצלנו.</div>`;
    if (w.step === 4) body = `
      <div class="list">
        <div><span>%</span><span class="grow">עמלה 10% מכל מכירה. <b>חודש ראשון בלי עמלה.</b></span></div>
        <div><span>💳</span><span class="grow">הלקוח משלם בדיוק את המחיר של העסק. עמלות הכרטיס על העסק.</span></div>
        <div><span>💰</span><span class="grow">הכסף של העסק מרגע המכירה, אחרי 24 שעות לביטול. העברה פעם בחודש.</span></div>
        <div><span>↩️</span><span class="grow">אם העסק נסגר או לא מכבד מתנה, הלקוח מקבל החזר מלא.</span></div>
        <div><span>📍</span><span class="grow">איסוף מהמקום בלבד. בלי משלוחים.</span></div>
      </div>
      <label class="check"><input type="checkbox" id="terms" ${w.terms ? 'checked' : ''}><span>בעל העסק קרא ומסכים לתנאים</span></label>`;
    if (w.step === 5) {
      const preview = { slug: 'new', emoji: T[w.type].emoji, products: w.products.filter((p) => p.on) };
      body = `
        <div class="card lime col center"><span class="small">קוד העסק</span><b class="code">${w.pin || (w.pin = String(1000 + Math.floor(Math.random() * 9000)))}</b><span class="micro">לרשום למנהל. אפשר להחליף בהגדרות.</span></div>
        ${stickerHTML(preview)}
        <div class="list"><div><span>⏱</span><span class="grow">מדריך של דקה לצוות</span><span class="pill lime">✓</span></div><div><span>🏷</span><span class="grow">מדבקת QR להדפסה</span><span class="pill lime">✓</span></div></div>`;
    }
    const nextOk = w.step === 1 ? w.name.trim() && w.address.trim() : w.step === 2 ? w.products.some((p) => p.on) : w.step === 4 ? w.terms : true;
    K.render(`
      ${K.header('עסק חדש')}
      <div class="tabs">${steps.map((s, i) => `<span class="tab" aria-selected="${w.step === i + 1}">${i + 1}. ${s}</span>`).join('')}</div>
      ${body}
      <div class="stack-bottom">
        <button class="btn lime" id="next" ${nextOk ? '' : 'disabled'}>${w.step === 5 ? 'לאשר ולהעלות לאוויר 🎉' : 'הבא'}</button>
        ${w.step > 1 ? '<button class="btn ghost" id="prev">חזרה</button>' : ''}
      </div>`);
    K.wireBack('admin');
    const recheck = () => { const ok = w.step === 1 ? w.name.trim() && w.address.trim() : w.step === 4 ? w.terms : true; document.getElementById('next').disabled = !ok; };
    K.on('[data-w]', 'input', (e) => { w[e.target.dataset.w] = e.target.value; recheck(); });
    K.on('[data-type]', 'click', (e) => { w.type = e.currentTarget.dataset.type; w.products = null; wizard(); });
    K.on('#logo', 'click', () => K.toast('בהדגמה משתמשים באימוג׳י של סוג העסק'));
    K.on('[data-on]', 'change', (e) => {
      const i = +e.target.dataset.on;
      if (e.target.checked && w.products.filter((p) => p.on).length >= 3) { e.target.checked = false; return K.toast('עד 3 מוצרים'); }
      w.products[i].on = e.target.checked; wizard();
    });
    K.on('[data-pi]', 'change', (e) => { const p = w.products[+e.target.dataset.pi]; const k = e.target.dataset.k; p[k] = k === 'price' ? +e.target.value : e.target.value; });
    K.on('#terms', 'change', (e) => { w.terms = e.target.checked; recheck(); });
    K.on('#prev', 'click', () => { w.step--; wizard(); });
    K.on('#next', 'click', async () => {
      if (w.step < 5) { w.step++; return wizard(); }
      const b = await A().addBusiness({ name: w.name.trim(), type: w.type, address: w.address.trim(), hours: w.hours.trim() || 'לפי שעות הפתיחה', phone: w.phone, pin: w.pin, slug: 'b' + Date.now().toString(36),
        products: w.products.filter((p) => p.on).map((p, i) => ({ id: 'p-' + Date.now().toString(36) + i, emoji: p.emoji, name: p.name, includes: p.includes, price: p.price })) });
      await A().approveBusiness(b.id);
      K.state.wiz = null; K.toast(`${b.name} באוויר 🎉`); K.go('biz?id=' + b.id);
    });
  }
})();
