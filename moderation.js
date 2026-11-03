// KARMA. text filter. The same word lists are loaded into the database (supabase/moderation.sql),
// so the check here is for instant feedback and the database check is the one that cannot be skipped.
//
// How matching works:
//   1. normalize: lowercase, drop Hebrew vowel marks, final letters → regular (ך→כ…),
//      digits/symbols that stand in for letters (0→o, @→a…), and collapse letters repeated 3+ times (שרמוטההה → שרמוטה).
//   2. "contains" terms are looked for inside the text with all spaces and punctuation removed,
//      so "ש ר מ ו ט ה" and "שרמוטההה" are caught too.
//   3. "word" terms are short words that would cause false alarms inside other words
//      (זין inside מזין), so they only match a whole word, with or without the prefixes ו/ה/ש.
(function (root) {
  const TERMS = {
    // Threats and incitement to violence
    violence: {
      contains: [
        'אהרוג', 'להרוג', 'יהרוג', 'תהרוג', 'נהרוג', 'ארצח', 'לרצוח', 'רוצח', 'ירצח',
        'אשבור לך', 'אשבור אותך', 'לשבור לך', 'אשבור לה', 'אשבור לו',
        'ארביץ', 'להרביץ', 'נרביץ', 'מרביצים', 'אדקור', 'לדקור', 'נדקור', 'סכין', 'אקדח',
        'לירות ב', 'אירה ב', 'יריות', 'לפוצץ אות', 'אפוצץ', 'לחנוק', 'אחנוק',
        'שתמות', 'תמותי', 'שתמותי', 'תמותו', 'תתאבד', 'להתאבד', 'לך תתלה', 'תתלי את עצמך',
        'לאנוס', 'אונס', 'אנסו',
        'kill you', 'kill your', 'kill yourself', 'gonna kill', 'rape', 'shoot you', 'stab',
      ],
      word: ['רצח', 'מכות', 'תמות', 'kys'],
    },
    // Exclusion and boycott language
    ostracism: {
      contains: [
        'עושים חרם', 'לעשות חרם', 'נעשה חרם', 'חרם על', 'להחרים', 'מחרימים', 'נחרים', 'כולם שונאים', 'כולנו שונאים', 'כולם צוחקים עליך', 'כולם צוחקים עלייך',
        'אף אחד לא אוהב', 'אף אחד לא רוצה אות', 'אל תדברו איתה', 'אל תדברו איתו', 'אל תזמינו',
        'לא מגיע לך לחיות', 'עופי מפה', 'עוף מפה', 'תעלמי מהעולם', 'תעלם מהעולם', 'עדיף בלעדיך', 'עדיף בלעדייך',
        'nobody likes you', 'everyone hates you',
      ],
      word: ['חרם', 'בחרם', 'לחרם'],
    },
    // Racism, homophobia and other hate
    hate: {
      contains: [
        'ערבוש', 'כושי', 'כושית', 'כושים', 'קוקסינל', 'מתרומם', 'נאצי', 'היטלר', 'יהודון', 'מחבל מסריח',
        'מפגר', 'מפגרת', 'מפגרים', 'אוטיסט מ',
        'nigg', 'faggot', 'retard', 'tranny',
      ],
      word: ['הומו', 'הומואים', 'fag'],
    },
    // Sexual content and crude insults
    sexual: {
      contains: [
        'זונה', 'שרמוטה', 'שרמוט', 'כוס אמא', 'כוס אמק', 'כוס עמק', 'כוסית', 'בן זונה', 'בת זונה',
        'מזדיין', 'תזדיין', 'תזדייני', 'לזיין', 'מזיין', 'זיון', 'ציצים', 'מניאק', 'מניאקית', 'חתיכת זבל', 'חתיכת חרא',
        'fuck', 'bitch', 'slut', 'whore', 'cunt', 'dick',
      ],
      word: ['זין', 'זיין', 'sex', 'סקס'],
    },
    // Body shaming
    body: {
      contains: ['מכוערת', 'מכוער', 'שמנה', 'שמנים', 'שמנמנה', 'אנורקסית', 'פרצוף של חזיר', 'חזירה', 'דובה שמנה', 'אתה שמן', 'שמן כמו', 'שמן ומכוער', 'שמן מגעיל'],
      word: ['פרה', 'ugly', 'fat'],
    },
  };

  const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };
  const PREFIX = 'והש';

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[֑-ׇ]/g, '')
      .replace(/[ךםןףץ]/g, (c) => FINALS[c])
      .replace(/[013457@$]/g, (c) => LEET[c])
      .replace(/(.)\1\1+/g, '$1');
  }
  const compact = (s) => s.replace(/[^a-zא-ת]/g, '');
  const words = (s) => s.split(/[^a-zא-ת]+/).filter(Boolean);
  function variants(w) {
    const out = [w];
    if (w.length > 3 && PREFIX.includes(w[0])) out.push(w.slice(1));
    if (w.length > 4 && PREFIX.includes(w[0]) && PREFIX.includes(w[1])) out.push(w.slice(2));
    return out;
  }

  // Prepared lists (normalized once)
  const LIST = [];
  for (const [category, t] of Object.entries(TERMS)) {
    for (const term of t.contains) LIST.push({ category, mode: 'contains', term: compact(normalize(term)) });
    for (const term of t.word) LIST.push({ category, mode: 'word', term: compact(normalize(term)) });
  }

  // Returns null when the text is fine, otherwise the category that matched.
  function check(text) {
    const n = normalize(text);
    const c = compact(n);
    const ws = new Set(words(n).flatMap(variants));
    for (const it of LIST) {
      if (it.mode === 'contains' ? c.includes(it.term) : ws.has(it.term)) return it.category;
    }
    return null;
  }

  const KarmaModeration = { check, normalize, compact, TERMS, LIST };
  if (typeof module !== 'undefined') module.exports = KarmaModeration;
  root.KarmaModeration = KarmaModeration;
})(typeof window !== 'undefined' ? window : globalThis);
