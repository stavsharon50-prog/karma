// Entry: welcome (alone / invited), friend approval, intro, "who do we start with", legal.
(function () {
  const { esc, api } = { esc: K.esc, get api() { return K.api; } };

  const fine = `<p class="micro muted center" style="margin:0">בכניסה מאשרים שמלאו לך 18 ושקראת את <a href="#/terms">התנאים</a> ואת <a href="#/privacy">מדיניות הפרטיות</a>.</p>`;
  const googleBtn = (label) => `<button class="btn white" id="g">${K.ICON.google}<span>${label}</span></button>`;

  async function afterLogin() {
    const inv = K.api.invite();
    if (inv && inv.kind) return K.go('approve');
    if (K.state.fresh) { K.state.fresh = false; await K.api.freshStart(); }
    K.go('start');
  }

  K.route('welcome', () => {
    const inv = K.api.invite();
    if (inv && inv.kind) return invited(inv);
    K.render(`
      <div class="col center" style="gap:6px;margin-top:8px">${K.logo('xl')}<p class="h2" style="margin:6px 0 0">הכול חוזר.</p></div>
      <div class="col" style="gap:14px;margin:6px 0">
        <div class="card peach wcard" style="transform:rotate(1.5deg)">
          <div class="head">${K.av({ name: 'מאיה', color: 'pink' })}<div class="body"><div class="k">You've been KARMAd 😈</div><b>מאיה: אכלת לי את הצ׳יפס 🍟</b></div>${K.chilis(2)}</div>
        </div>
        <div class="card pink wcard" style="transform:rotate(-1.5deg)">
          <div class="head">${K.av({ name: 'נוי', color: 'lime' })}<div class="body"><div class="k">You've been KARMAd 😇</div><b>נוי: סתם כי התגעגעתי 🫶</b></div><span style="font-size:26px">☕</span></div>
        </div>
      </div>
      <p class="center" style="margin:0;font-size:16px"><b>מישהו חייב לך?</b> פותחים ביף. <b>מגיע למישהו?</b> שולחים גוד קארמה. וסוגרים הכול בקפה אמיתי.</p>
      <div class="stack-bottom">
        ${googleBtn('המשך עם Google')}
        <p class="small center" style="margin:0">🔒 רק חברים שאישרת יכולים לשלוח לך ביף או גוד קארמה.</p>
        ${fine}
        <details class="micro muted center"><summary>הדגמה: איך זה נראה כשמזמינים אותך?</summary>
          <div class="row" style="justify-content:center;margin-top:8px;flex-wrap:wrap">
            <button class="chip" data-demo="beef">עם ביף 😈</button><button class="chip" data-demo="karma">עם גוד קארמה 😇</button><button class="chip" data-demo="plain">הזמנה רגילה</button><button class="chip" data-demo="fresh">משתמש חדש לגמרי</button>
          </div></details>
      </div>`);
    K.on('#g', 'click', async () => { if (await K.google()) afterLogin(); });
    K.on('[data-demo]', 'click', async (e) => {
      const d = e.currentTarget.dataset.demo;
      if (d === 'fresh') { K.state.fresh = true; if (await K.google()) afterLogin(); return; }
      K.api.setInvite(d); K.routes.welcome();
    });
  });

  function invited(inv) {
    const f = inv.fromP;
    const card = inv.kind === 'beef'
      ? `<div class="card peach hero">
          <span class="kicker">You've been KARMAd 😈</span>
          <div class="row" style="justify-content:center">${K.av(f, 'lg')}</div>
          <h1 class="center">ל${esc(f.name)} יש ביף איתך</h1>
          <div class="sticker"><span class="big-reason redacted" aria-hidden="true">${esc(inv.beef.reason)}</span>${K.chilis(inv.beef.spice)}</div>
          <p class="center h3" style="margin:0">רוצה לדעת מה עשית? 👀</p></div>`
      : inv.kind === 'karma'
        ? `<div class="card pink hero">
          <span class="kicker">You've been KARMAd 😇</span>
          <div class="row" style="justify-content:center">${K.av(f, 'lg')}</div>
          <h1 class="center">ל${esc(f.name)} יש משהו טוב בשבילך</h1>
          <div class="sticker"><span class="big-reason redacted" aria-hidden="true">${esc(inv.karma.message)}</span></div>
          <p class="center h3" style="margin:0">רוצה לראות? 💌</p></div>`
        : `<div class="card lime hero">
          <div class="row" style="justify-content:center">${K.av(f, 'lg')}</div>
          <h1 class="center">${esc(f.name)} ${K.G(f.p, 'מזמינה', 'מזמין')} אותך ל-KARMA.</h1>
          <p class="center" style="margin:0">ביפים, גוד קארמה ומתנות אמיתיות. בין חברים.</p></div>`;
    K.render(`
      <div class="row between">${K.logo()}<button class="link muted micro" id="noinv">זו לא הזמנה שלי</button></div>
      ${card}
      <div class="stack-bottom">${googleBtn(inv.kind === 'plain' ? 'המשך עם Google' : 'להתחבר ולראות')}${fine}</div>`, { theme: inv.kind === 'beef' ? 'peach' : inv.kind === 'karma' ? 'pink' : '' });
    K.on('#g', 'click', async () => { if (await K.google()) afterLogin(); });
    K.on('#noinv', 'click', () => { K.api.setInvite(null); K.routes.welcome(); });
  }

  // After login with an invite: approve the friend, then see what they sent.
  K.route('approve', () => {
    const inv = K.api.invite();
    if (!inv) return K.go('');
    const f = inv.fromP;
    K.render(`
      <div class="col center" style="gap:14px;margin-top:40px">
        ${K.av(f, 'xl')}
        <h1>${esc(f.name)} ${K.G(f.p, 'רוצה להיות חברה', 'רוצה להיות חבר')} שלך ב-KARMA.</h1>
        <p class="muted" style="margin:0">חברים יכולים לשלוח אחד לשני ביפים, גוד קארמה והתערבויות.</p>
      </div>
      <div class="stack-bottom">
        <button class="btn lime" id="ok">${inv.kind === 'plain' ? 'לאשר' : 'לאשר ולראות'}</button>
        <button class="btn ghost" id="no">לא עכשיו</button>
      </div>`);
    K.on('#ok', 'click', async () => {
      await K.api.approveInvite();
      if (inv.kind === 'beef') return K.go('beef/b0?first=1');
      if (inv.kind === 'karma') return K.go('karma/k0?first=1');
      K.api.setOnboarded(); K.go('');
    });
    K.on('#no', 'click', () => { K.api.clearInvite(); K.go('start'); });
  });

  K.route('intro', () => {
    const inv = K.api.invite();
    K.render(`
      <div class="col" style="gap:6px;margin-top:10px"><h1>ככה זה עובד</h1><p class="muted" style="margin:0">שלושה דברים, וזהו.</p></div>
      <div class="col" style="gap:12px">
        <div class="card peach row" style="align-items:flex-start"><span style="font-size:34px">😈</span><div><h2>ביף</h2><p style="margin:2px 0 0">מישהו חייב לך? פותחים ביף. הוא סוגר בהתנצלות, בשיר, או בקפה אמיתי.</p></div></div>
        <div class="card pink row" style="align-items:flex-start"><span style="font-size:34px">😇</span><div><h2>גוד קארמה</h2><p style="margin:2px 0 0">מגיע למישהו? תודה, מזל טוב, סתם כי התגעגעת. עם מתנה או בלי.</p></div></div>
        <div class="card lime row" style="align-items:flex-start"><span style="font-size:34px">🎁</span><div><h2>מתנות אמיתיות</h2><p style="margin:2px 0 0">קפה, גלידה ופרחים מעסקים קטנים בשכונה. אוספים במקום עם קוד.</p></div></div>
      </div>
      <div class="stack-bottom"><button class="btn" id="go">יאללה</button></div>`);
    K.on('#go', 'click', () => {
      if (inv && inv.approved) { K.api.setOnboarded(); K.go(''); }
      else K.go('start');
    });
  });

  K.route('start', () => {
    K.render(`
      <div class="col" style="gap:6px;margin-top:10px"><h1>עם מי מתחילים?</h1></div>
      <div class="col" style="gap:10px">
        <button class="opt" data-k="beef" style="background:var(--peach)"><span class="em">😈</span><span style="flex:1"><span class="t">לפתוח ביף על מישהו</span></span></button>
        <button class="opt" data-k="karma" style="background:var(--pink)"><span class="em">😇</span><span style="flex:1"><span class="t">לשלוח גוד קארמה</span></span></button>
        <button class="opt" data-k="plain"><span class="em">💬</span><span style="flex:1"><span class="t">רק להזמין</span></span></button>
      </div>
      <div class="stack-bottom"><button class="btn ghost" id="later">אחר כך</button></div>`);
    K.on('[data-k]', 'click', (e) => {
      const k = e.currentTarget.dataset.k; K.api.setOnboarded();
      if (k === 'beef') return K.go('new-beef?first=1');
      if (k === 'karma') return K.go('new-karma?first=1');
      K.shareWA(K.inviteText('plain')); K.go('');
    });
    K.on('#later', 'click', () => { K.api.setOnboarded(); K.go(''); });
  });

  // Legal drafts (for the lawyer to review).
  const legal = (title, body) => () => {
    K.render(`${K.header(title)}<div class="col small" style="gap:12px">${body}<p class="micro muted">טיוטה לבדיקת עורך דין. עודכן ${new Date().toLocaleDateString('he-IL')}.</p></div>`);
    K.wireBack('');
  };
  K.route('privacy', legal('מדיניות פרטיות', `
    <p><b>מה אנחנו שומרים:</b> שם, תמונה ומייל מ-Google, החברים שאישרת, הביפים, הגוד קארמה וההתערבויות שלך, ויום ההולדת אם בחרת להוסיף.</p>
    <p><b>מי רואה מה:</b> ביף וגוד קארמה רואים רק שני הצדדים. אין פיד ציבורי.</p>
    <p><b>מתנות:</b> העסק רואה רק שמתנה מומשה ומה היא כללה. בלי שם הלקוח. מי ששלח מתנה לא מקבל הודעה כשמממשים אותה.</p>
    <p><b>תשלומים:</b> פרטי האשראי נשמרים אצל ספק הסליקה בלבד, לא אצלנו.</p>
    <p><b>מחיקה:</b> אפשר למחוק את החשבון מהפרופיל בכל רגע. הכול נמחק.</p>`));
  K.route('terms', legal('תנאי שימוש', `
    <p><b>גיל:</b> השימוש מגיל 18.</p>
    <p><b>בכיף בלבד:</b> בלי איומים, בלי חרמות, בלי הערות על מראה. טקסט פוגע נחסם, ומי שמדווחים עליו שוב ושוב מושהה.</p>
    <p><b>מתנות:</b> המתנה נרכשת מהעסק ונאספת במקום. תוקף ומדיניות ביטול לפי מה שמופיע במתנה. אם העסק נסגר או מסרב לכבד, הכסף חוזר במלואו. אפשר לבטל רכישה תוך 24 שעות.</p>
    <p><b>התערבויות:</b> רק על כבוד או על מתנה קטנה מעסק. לא על כסף.</p>`));
})();
