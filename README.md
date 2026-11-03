# KARMA.

כל חשבון פתוח נסגר בסוף. בכיף.

גרסה ראשונה (MVP) לניסוי עם משתמשים: אתר שעובד בטלפון וגם אפשר להתקין אותו על המסך הראשי. בלי App Store, ובלי שלב build.

## מה יש בפנים

| קובץ | תפקיד |
|---|---|
| `index.html` | המעטפת של האפליקציה |
| `app.css` | העיצוב, לפי ה-Design System בפיגמה |
| `app.js` | כל המסכים והניווט |
| `api.js` | החיבור לשרת (Supabase), וגם מצב הדגמה עם חברים מדומים |
| `config.js` | **הקובץ היחיד שצריך למלא**: הכתובת והמפתח של Supabase |
| `supabase/schema.sql` | בסיס הנתונים, ההרשאות וכללי הפרטיות |
| `sw.js`, `manifest.webmanifest`, `icons/` | התקנה כאפליקציה ואייקונים |

כל עוד `config.js` ריק, האפליקציה רצה **במצב הדגמה**: יש בה חברים מדומים שעונים לך אחרי כמה שניות, והנתונים נשמרים רק בטלפון.

## הפעלה (פעם אחת)

1. **Supabase:** יוצרים פרויקט, ואז בתפריט **SQL Editor** ← **New query** מדביקים את כל התוכן של `supabase/schema.sql` ולוחצים **Run**.
2. **כניסה עם Google:** ב-Supabase נכנסים ל-**Authentication** ← **Providers** ← **Google** ומפעילים. צריך Client ID ו-Secret מ-Google Cloud Console.
3. **כתובות מותרות:** ב-**Authentication** ← **URL Configuration** מגדירים **Site URL** = `https://stavsharon50-prog.github.io/karma/` ומוסיפים אותה גם ל-**Redirect URLs**.
4. **config.js:** מעתיקים מ-**Project Settings** ← **API** את ה-Project URL ואת ה-anon public key. מותר לפרסם את שניהם, כי כללי ההרשאות במסד הנתונים הם מה שמגן על המידע.
5. **GitHub Pages:** ב-repository נכנסים ל-**Settings** ← **Pages**, בוחרים Branch `main` ותיקייה `/ (root)`.

## מה נמדד

כל פעולה חשובה נרשמת בטבלה `events`: הרשמה, טינה שנוצרה, הזמנה ששותפה, הצעה שנשלחה, חשבון שנסגר, דיווח, וכמה אנשים לחצו על Karma Gifts.

## עוד לא בגרסה הזו

מתנות בתשלום (Karma Gifts מופיע רק ככפתור "בקרוב" שמודד עניין), התראות push, מנוי KARMA+, Wrapped, לוח קבוצתי ו-Beef Court.
