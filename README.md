# Team Flow

Jamoaviy vazifalar boshqaruvi: React (Vite) + Node/Express + MongoDB.

## Talablar
- Node.js 18+
- MongoDB (lokal `mongodb://127.0.0.1:27017` yoki MongoDB Atlas)

## Ishga tushirish
```bash
# 1) Server
cd server
cp .env.example .env      # MONGO_URI, JWT_SECRET va SMTP sozlamalarini to'ldiring
npm install
npm start                 # http://localhost:5000

# 2) Client (boshqa terminalda)
cd client
npm install
npm run dev               # http://localhost:5173
```

## Email tekshiruvi
1. Ro'yxatdan o'tishda email formati va domenning **MX yozuvi** (haqiqiy pochta serveri bor-yo'qligi) tekshiriladi.
2. Emailga **6 xonali tasdiqlash kodi** yuboriladi; kod kiritilmaguncha kirish mumkin emas.
3. SMTP sozlanmasa (`.env` da `SMTP_HOST` bo'sh), kod server konsolida chiqadi — faqat test uchun.
   Gmail uchun "App Password" yarating va `SMTP_USER` / `SMTP_PASS` ga yozing.

## Ishlash tartibi
- Team Leader loyiha ochadi va ishchi emailini belgilab vazifa beradi (ishchi avval ro'yxatdan o'tgan bo'lishi kerak).
- Vazifalar 3 ustunda card ko'rinishida: **Vazifalar → Processing → Tasdiqlandi**.
- Ishchi "Hisobotlar" bo'limida matn + fayl/rasm bilan hisobot yuboradi (Team Leader emaili belgilanadi). Hisobot loyiha a'zolariga ko'rinadi, komment qoldirish mumkin.
- Team Leader hisobotni qabul qiladi yoki rad etadi. Qabul qilinsa, kartani Processing'dan Tasdiqlandi'ga drag & drop qiladi; rad etilsa Processing'da qoladi (ishchi qayta hisobot yuborishi mumkin).
- Dark/light rejim va barcha vaqtlar doimiy **UTC+5** (Asia/Tashkent) bo'yicha.

## Production
```bash
cd client && npm run build   # client/dist yaratiladi
cd ../server && npm start    # server dist ni ham xizmat qiladi (5000-port)
```

## Yangi imkoniyatlar (v2)
- Kirishdan oldin tanishuv sahifasi (qisqa yo'riqnoma), navbarda Kirish / Ro'yxatdan o'tish.
- Team Leader "Members" bo'limida barcha ro'yxatdan o'tgan foydalanuvchilarni ko'radi va taklif yuboradi; taklif "Xabarlar" orqali qabul qilinadi yoki rad etiladi.
- Vazifa berishda ishchi ism/email harflari bo'yicha guruh a'zolari orasidan tanlanadi.
- Profil: ism va avatarkani o'zgartirish.
- Ustunlar: ToDo, Process, Process Viewing, Done. Hisobot yuborilganda karta Process Viewing'ga tushadi; qabul qilingach Done'ga sudraladi; rad etilsa Process'ga qaytadi.
- Frontend alohida joyda bo'lsa: client'da `VITE_API_URL=https://backend-manzili` o'rnating.
- Eski ma'lumotlardagi "approved" holati serverni ishga tushirganda avtomatik "done" ga o'giriladi.
