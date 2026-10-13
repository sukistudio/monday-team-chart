# monday-team-chart

**Monday Team 🌙🐾 — ทีมของเปรม** · ผัง 4 ทีม: Software (Tide 🌊) · Marketing (Beam 🌕) · Finance (Harbor ⚓) · Research (Horizon 🌅) · ข้อมูล ณ 2026-10-14 — monday-oracle `1f07490` (Task Brief #8 / #8c + แผนทีม Finance / Research + CLAUDE.md "My Team") · roster ตรงกับ `public/team.json` ของ office (ทีม · lead · สี)

- เว็บ: https://monday-team-chart.vercel.app
- URL เก่า https://software-team-chart.vercel.app → หน้า redirect มาที่นี่ (repo นี้เดิมชื่อ `software-team-chart`)

static หน้าเดียว (`index.html` — HTML/CSS ล้วน ไม่มี build) · ภาษาไทย · มือถือ 375px · dark/light ตามระบบ

## Deploy (Vercel CLI, ไม่ link GitHub)

หน้าเต็ม → project `monday-team-chart`:

```bash
vercel link --yes --scope sukistudios-projects --project monday-team-chart
vercel --prod --yes > /tmp/monday-team-chart.txt 2>&1; grep -o 'dpl_[A-Za-z0-9]*' /tmp/monday-team-chart.txt | head -1   # deploy ครั้งเดียว ไม่ tail
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

- หน้า public: ห้ามชื่อ repo private (ใช้ "repo ข้อมูลการเงิน" / "เครื่องมือวิดีโอแผนที่") · `*-oracle` โชว์ได้ · ไม่มีตัวเลขเงิน/ชื่อบัญชี/ธนาคาร
- หน้า public: ห้ามชื่อ repo ข้อมูลวิจัย (private) — เขียน "repo ข้อมูลวิจัย"
- สถานะลูกทีม Finance / Research ตรวจจาก `~/.maw/fleet/<NNN-name>.json` ตอนแก้ข้อมูล (มี = เกิดแล้ว · `142-chart` ยังไม่มี = รอเกิด)
- สีทีม: Software ฟ้า · Marketing ทอง · Finance เขียว · **Research fuchsia `#E879F9`** (พื้น `#4A044E` · โหมดสว่าง `#A21CAF`) — ค่าเดียวกับ office · ไม่ใช้ส้ม `#FB923C` เพราะชนสี "รอเปรม" ใน office
- layout ผังทีม: ≥ 1200px 4 คอลัมน์ (กว้างกว่าเนื้อหา) · 761–1199px 2×2 · ≤ 760px คอลัมน์เดียว

🤖 สร้างโดย Tide/Ripple/Swell/Shore จาก [เปรม] → sukistudio/monday-team-chart
