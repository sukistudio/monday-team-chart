# monday-team-chart

**Monday Team 🌙🐾 — ทีมของเปรม** · ผัง 5 ทีม: Software (Tide 🌊) · Marketing (Beam 🌕) · Finance (Harbor ⚓) · Research (Horizon 🌅) · Real Estate (Atlas 🏡) · ข้อมูล ณ 2026-10-19 · เพิ่มลูกทีม Real Estate 3 คน (Survey · Hearth · Plumb) · ตรวจรายชื่อกับ public feed v3 ก่อน deploy

- เว็บ: https://monday-team-chart.vercel.app
- URL เก่า https://software-team-chart.vercel.app → หน้า redirect มาที่นี่ (repo นี้เดิมชื่อ `software-team-chart`)

static หน้าเดียว (`index.html` — HTML/CSS ล้วน ไม่มี build) · ภาษาไทย · มือถือ 375px · dark/light ตามระบบ

## ตรวจรายชื่อและ public gate (Bun · ไม่มี dependency)

- รัน `bun test` เพื่อตรวจ cards, engine และ public gate; `bun run check` รัน tests แล้วเทียบสมาชิกกับ [public feed v3](https://raw.githubusercontent.com/sukistudio/monday-office-feed/main/feed.json)
- feed มี id ที่ chart ไม่มี → ล้ม exit 1; chart มี id ที่ feed ไม่มี → เตือน แต่ exit 0 (เช่น peer/ตัวที่วางแผนไว้/OMX ที่ feed ยังไม่เก็บ)
- ดึง feed ไม่สำเร็จ, JSON/schema ผิด หรือ id ซ้ำ → ล้ม ไม่ข้ามการตรวจเงียบ ๆ; runtime ไม่ดึง feed และไม่แสดง task จาก feed
- ทดสอบ offline: `bun run check-members --offline tests/fixtures/member-feed-complete.json` (fixture สำหรับทดสอบ ไม่ใช่ roster สด)
- `data-session` บน agent cards คือ roster; human card ไม่สร้าง session/engine สมมติ · Sunny แสดง Claude แต่ไม่เดารุ่นที่ข้อมูลเดิมไม่ได้ระบุ
- public gate ใช้ SHA-256 ของ token ชื่อที่ห้ามเผยแพร่ (case-sensitive เช่นเดียวกับ gate ต้นทาง) โดยไม่เก็บรายการชื่อตรงตัวใน repo นี้

## Deploy (Vercel CLI, ไม่ link GitHub)

หน้าเต็ม → project `monday-team-chart`:

```bash
bun run check  # ต้องผ่านก่อน deploy ทุกครั้ง
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

`docs/screenshots/omx-{light,dark}-375.png` (ผังปัจจุบัน) · `omx-{light,dark}-375-detail.png` (รายละเอียดป้าย engine)

ภาพเดิม: `docs/screenshots/shot-{light,dark}-{375,1280}.png`

- หน้า public: ห้ามชื่อ repo private (ใช้ "repo ข้อมูลการเงิน" / "เครื่องมือวิดีโอแผนที่") · `*-oracle` โชว์ได้ · ไม่มีตัวเลขเงิน/ชื่อบัญชี/ธนาคาร
- หน้า public: ห้ามชื่อ repo ข้อมูลวิจัย (private) — เขียน "repo ข้อมูลวิจัย"
- Chart เกิดแล้ว 2026-10-16; สถานะ Prism/Compass คงเป็นรอเกิดตามข้อมูลเดิม · feed check ไม่อัปเดตบทบาท/รุ่น/วันเกิดให้เอง
- สีทีม: Software ฟ้า · Marketing ทอง · Finance เขียว · **Research fuchsia `#E879F9`** (พื้น `#4A044E` · โหมดสว่าง `#A21CAF`) — ค่าเดียวกับ office · ไม่ใช้ส้ม `#FB923C` เพราะชนสี "รอเปรม" ใน office
- layout ผังทีม: ≥ 1200px 4 คอลัมน์ (กว้างกว่าเนื้อหา) · 761–1199px 2×2 · ≤ 760px คอลัมน์เดียว

🤖 สร้างโดย Tide/Ripple/Swell/Shore จาก [เปรม] → sukistudio/monday-team-chart
