# monday-team-chart

**Monday Team 🌙🐾 — ทีมของเปรม** · ผังทีม Software (Tide 🌊) + Marketing (Beam 🌕) · ข้อมูล ณ 2026-10-11

- เว็บ: https://monday-team-chart.vercel.app
- URL เก่า https://software-team-chart.vercel.app → หน้า redirect มาที่นี่ (repo นี้เดิมชื่อ `software-team-chart`)

static หน้าเดียว (`index.html` — HTML/CSS ล้วน ไม่มี build) · ภาษาไทย · มือถือ 375px · dark/light ตามระบบ

## Deploy (Vercel CLI, ไม่ link GitHub)

หน้าเต็ม → project `monday-team-chart`:

```bash
vercel link --yes --scope sukistudios-projects --project monday-team-chart
vercel --prod --yes
```

หน้า redirect → project เดิม `software-team-chart` (ให้ลิงก์เก่าที่แชร์ไปแล้วยังใช้ได้):

```bash
cd redirect
vercel link --yes --scope sukistudios-projects --project software-team-chart
vercel --prod --yes
```

`redirect/index.html` = `<meta http-equiv="refresh">` + ลิงก์ + ข้อความ "ย้ายไป Monday Team" · แก้หน้าหลักแล้ว deploy แค่ project `monday-team-chart` ที่เดียว

`.vercelignore` ส่งขึ้นแค่ `index.html` · `.vercel/` และ `.env*` อยู่ใน `.gitignore`

## Screenshots

`docs/screenshots/shot-{light,dark}-{375,1280}.png`

🤖 สร้างโดย Tide/Ripple/Shore จาก [เปรม] → sukistudio/monday-team-chart
