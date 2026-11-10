// Shared building blocks used by several screens.
(function () {
  const { esc } = K;

  K.gv = (p, f, m) => K.G(p && p.p, f, m); // gender a word for a friend object

  K.statusPill = (b) => {
    const map = {
      open: ['peach', 'פתוח'], pending: ['pink', 'הצעה מחכה'], wantmore: ['peach', 'רוצה יותר 😤'],
      settled: ['lime', b.closedBy === 'gift' ? `נסגר ${b.gift && b.gift.product ? b.gift.product.emoji : '🎁'}` : `נסגר ${b.gesture ? K.api.GESTURES[b.gesture].emoji : '🤝'}`],
      released: ['lav', 'שוחרר 🕊'], cooled: ['lav', 'התקרר ❄️'], removed: ['', 'הוסר'],
    };
    const [c, t] = map[b.status] || ['', b.status];
    return `<span class="pill ${c}">${t}</span>`;
  };
  K.coolLeft = (b) => {
    if (b.spice !== 1 || b.status !== 'open') return null;
    const left = Math.ceil((new Date(b.createdAt).getTime() + 7 * 864e5 - Date.now()) / 864e5);
    return left <= 0 ? 'היום' : left === 1 ? 'מחר' : `בעוד ${left} ימים`;
  };
  K.beefRow = (b, opts) => {
    const mine = b.from === 'me';
    const href = ['settled', 'released', 'cooled'].includes(b.status) ? `#/closed/${b.id}` : mine ? `#/mine/${b.id}` : `#/beef/${b.id}`;
    const cool = K.coolLeft(b);
    return `<a class="beef ${['settled', 'released', 'cooled'].includes(b.status) ? 'closed' : ''}" href="${href}">
      ${K.av(b.friend)}
      <span class="body"><span class="reason">${esc(b.reason)}</span>
      <span class="meta">${mine ? 'על ' : ''}${esc(b.friend.name)} · ${K.timeAgo(b.createdAt)} · ${K.chilis(b.spice)}${cool && opts && opts.cool ? ` · ❄️ מתקרר ${cool}` : ''}</span></span>
      ${K.statusPill(b)}</a>`;
  };

  K.prodCard = (p, opts) => {
    opts = opts || {};
    return `<button class="prod" data-pid="${p.id}" aria-pressed="${opts.on ? 'true' : 'false'}">
      ${opts.badge ? `<span class="badge ${opts.badgeCls || ''}">${esc(opts.badge)}</span>` : ''}
      <span class="em">${p.emoji}</span>
      <span class="body"><span class="t">${esc(p.name)}</span><span class="s">${esc(p.biz.name)} · איסוף מהמקום</span></span>
      <span class="price">${K.money(p.price)}</span></button>`;
  };

  K.validity = (g) => {
    const days = Math.ceil((new Date(g.expiresAt) - Date.now()) / 864e5);
    if (days <= 7) return `<span class="pill peach">⏳ נשאר${days === 1 ? ' יום אחד' : ` ${days} ימים`}</span>`;
    return `<span class="micro muted">בתוקף עד ${K.dateShort(g.expiresAt)}</span>`;
  };
  K.sourceText = (g) => ({ beef: 'סגירת חשבון', karma: 'גוד קארמה', bet: 'התערבות' }[g.source] || '');
  K.giftCard = (g) => {
    const used = g.status !== 'active';
    return `<a class="gift-card ${used ? 'used' : ''}" href="${used ? '#/wallet?tab=used' : '#/redeem/' + g.id}">
      <span class="em">${g.product.emoji}</span>
      <span class="body"><b style="font-size:16px">${esc(g.product.name)}</b>
        <span class="small">${esc(g.product.biz.name)}</span>
        <span class="micro muted">מ${esc(g.fromP.name)} · ${K.sourceText(g)}</span></span>
      ${used ? `<span class="micro muted">מומש ${K.dateShort(g.redeemedAt)}</span>` : K.validity(g)}</a>`;
  };

  // A QR-looking pattern derived from the code (the real one will be a scannable QR).
  K.qrSVG = (seed) => {
    const N = 25; let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    const finder = (x, y) => (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
    let r = '';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!finder(x, y) && rnd() > 0.52) r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    const f = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`;
    return `<svg viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" fill="#1B1116" role="img" aria-label="קוד QR">${f(0, 0)}${f(N - 7, 0)}${f(0, N - 7)}${r}</svg>`;
  };

  K.friendPicker = (sel, opts) => {
    opts = opts || {};
    const fs = K.api.friends();
    return `<div class="friends-row" role="group" aria-label="חברים">
      ${fs.map((f) => `<button class="friend-pick" data-fid="${f.id}" aria-pressed="${sel === f.id}">${K.av(f, 'lg')}<span>${esc(f.name)}${f.invited ? ' ⏳' : ''}</span></button>`).join('')}
      ${opts.invite === false ? '' : `<button class="friend-pick" data-invite><span class="av lg" style="border-style:dashed">+</span><span>להזמין</span></button>`}
    </div>`;
  };
  // Wire a picker; onPick(fid) after selection. Inviting asks for a name and creates a pending friend.
  K.wirePicker = (onPick) => {
    K.on('.friend-pick[data-fid]', 'click', (e) => {
      const b = e.currentTarget;
      document.querySelectorAll('.friend-pick[data-fid]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      onPick(b.dataset.fid);
    });
    K.on('.friend-pick[data-invite]', 'click', async () => {
      const name = await K.askName(); if (!name) return;
      const f = await K.api.inviteFriend(name);
      onPick(f.id, true);
    });
  };
  // Sheet inputs vanish when the sheet closes, so read them on the button click.
  K.askName = () => new Promise((resolve) => {
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="הזמנת חבר"><h2>את מי מזמינים?</h2>
      <label class="field">השם<input class="input" id="inv-name" maxlength="20" autocomplete="off"></label>
      <p class="micro muted" style="margin:0">אחרי השליחה נפתח וואטסאפ עם ההזמנה.</p>
      <button class="btn lime" id="inv-ok">להוסיף</button><button class="btn ghost" id="inv-no">ביטול</button></div>`;
    const done = (v) => { bg.remove(); resolve(v); };
    bg.addEventListener('click', (e) => { if (e.target === bg) done(null); });
    document.body.appendChild(bg);
    const inp = bg.querySelector('#inv-name'); inp.focus();
    bg.querySelector('#inv-ok').onclick = () => done(inp.value.trim() || null);
    bg.querySelector('#inv-no').onclick = () => done(null);
  });

  // Birthday is asked once, at a nice moment.
  K.askBirthday = async () => {
    if (K.api.bdayAsked() || K.api.me().birthday) return;
    const here = location.hash;
    await new Promise((r) => setTimeout(r, 900));
    if (location.hash !== here || document.querySelector('.sheet-bg')) return;
    K.api.setBdayAsked();
    const bg = document.createElement('div'); bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="יום הולדת">
      <div style="font-size:44px;text-align:center">🎂</div>
      <h2 class="center">רוצה שגם לך ישלחו ביום ההולדת?</h2>
      <p class="muted center small" style="margin:0">רק יום וחודש. חברים יקבלו תזכורת קטנה כמה ימים לפני.</p>
      <div class="row"><select class="input" id="bd-d" aria-label="יום">${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select>
      <select class="input" id="bd-m" aria-label="חודש">${K.MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select></div>
      <button class="btn pink" id="bd-ok">לשמור</button><button class="btn ghost" id="bd-no">אולי אחר כך</button></div>`;
    document.body.appendChild(bg);
    const close = () => bg.remove();
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    bg.querySelector('#bd-no').onclick = close;
    bg.querySelector('#bd-ok').onclick = async () => {
      const d = bg.querySelector('#bd-d').value, m = bg.querySelector('#bd-m').value;
      close(); await K.api.updateMe({ birthday: `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` }); K.toast('נשמר 🎂');
    };
  };

  // ───────── story images (1080×1920), shared as a file ─────────
  const C = { cream: '#FFF4E6', ink: '#1B1116', chili: '#FF4A2B', pink: '#FF5FA8', pinkSoft: '#FFE1EF', lime: '#C8F135', peach: '#FFD6C9', lav: '#F1EEF6', white: '#FFFFFF' };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function box(ctx, x, y, w, h, fill, r, sh) { ctx.fillStyle = C.ink; rr(ctx, x + (sh || 14), y + (sh || 14), w, h, r || 40); ctx.fill(); ctx.fillStyle = fill; rr(ctx, x, y, w, h, r || 40); ctx.fill(); ctx.lineWidth = 7; ctx.strokeStyle = C.ink; ctx.stroke(); }
  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = String(text).split(' '); let line = '', yy = y; const lines = [];
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line); lines.forEach((l, i) => ctx.fillText(l, x, yy + i * lh)); return lines.length * lh;
  }
  // spec: { bg, kicker, title, big, card: { lines: [..], fill }, footer }
  K.storyCanvas = async (spec) => {
    try { await document.fonts.ready; } catch (e) {}
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920;
    const ctx = cv.getContext('2d'); ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = C[spec.bg] || C.cream; ctx.fillRect(0, 0, 1080, 1920);
    // confetti dots
    const dots = [C.pink, C.lime, C.chili, C.ink];
    for (let i = 0; i < 26; i++) { ctx.fillStyle = dots[i % 4]; ctx.globalAlpha = .9; ctx.beginPath(); ctx.arc(i % 2 ? 30 + (i * 37) % 90 : 960 + (i * 53) % 90, 80 + ((i * 613) % 1760), 8 + (i % 4) * 3, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // logo
    ctx.direction = 'ltr'; ctx.fillStyle = spec.bg === 'ink' ? C.cream : C.ink; ctx.font = '900 96px Rubik, sans-serif';
    const lw = ctx.measureText('KARMA').width, dw = ctx.measureText('.').width; ctx.textAlign = 'left';
    ctx.fillText('KARMA', 540 - (lw + dw) / 2, 200); ctx.fillStyle = C.pink; ctx.fillText('.', 540 - (lw + dw) / 2 + lw, 200); ctx.textAlign = 'center';
    let y = 520;
    if (spec.kicker) { ctx.font = '900 46px Rubik, sans-serif'; const w = ctx.measureText(spec.kicker).width + 80; box(ctx, 540 - w / 2, y - 45, w, 90, C.white, 45, 8); ctx.fillStyle = C.ink; ctx.fillText(spec.kicker, 540, y + 2); y += 150; }
    ctx.direction = 'rtl';
    if (spec.big) { ctx.font = '900 150px Rubik, sans-serif'; ctx.fillStyle = spec.bg === 'ink' ? C.cream : C.ink; ctx.direction = spec.bigLtr ? 'ltr' : 'rtl'; ctx.fillText(spec.big, 540, y + 60); ctx.direction = 'rtl'; y += 220; }
    if (spec.title) { ctx.font = '900 70px Rubik, sans-serif'; ctx.fillStyle = spec.bg === 'ink' ? C.cream : C.ink; y += wrapText(ctx, spec.title, 540, y, 900, 84) + 40; }
    if (spec.card) {
      const lines = spec.card.lines; const h = 120 + lines.length * 100;
      ctx.save(); ctx.translate(540, y + h / 2); ctx.rotate(-0.04); ctx.translate(-540, -(y + h / 2));
      box(ctx, 110, y, 860, h, C[spec.card.fill] || C.white, 50, 16);
      lines.forEach((l, i) => { ctx.fillStyle = C.ink; ctx.font = (i === 0 ? '900 64px' : '700 50px') + ' Rubik, Heebo, sans-serif'; ctx.fillText(l, 540, y + 110 + i * 100); });
      ctx.restore(); y += h + 80;
    }
    if (spec.sub) { ctx.font = '700 52px Heebo, sans-serif'; ctx.fillStyle = spec.bg === 'ink' ? C.cream : C.ink; wrapText(ctx, spec.sub, 540, y, 900, 66); }
    ctx.font = '700 42px Heebo, sans-serif'; ctx.fillStyle = spec.bg === 'ink' ? C.cream : C.ink;
    ctx.fillText(spec.footer || 'הכול חוזר. · KARMA.', 540, 1800);
    return cv;
  };
  K.shareStory = async (spec, name) => {
    K.api.log('story_share', { kind: name });
    const cv = await K.storyCanvas(spec);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    const file = new File([blob], (name || 'karma') + '.png', { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    K.sheetHTML(`<h2>לסטורי</h2><img class="story-prev" src="${url}" alt="תמונה לסטורי">
      <a class="btn pink" href="${url}" download="${esc(name || 'karma')}.png" data-v="dl">לשמור את התמונה</a>
      <p class="micro muted center" style="margin:0">שומרים ומעלים לסטורי. בלי שם העסק ובלי מחיר.</p>
      <button class="btn ghost" data-v="">סגירה</button>`, 'סטורי');
  };
})();
