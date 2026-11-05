import React from 'react';

const FEATURES = [
  ['#4dabf7', 'Vazifa cardlari', 'ToDo, Process, Process Viewing va Done ustunlari. Kartani sudrab o‘tkazing.'],
  ['#ffb340', 'Takliflar va xabarlar', 'Team Leader foydalanuvchini taklif qiladi, u xabarlar bo‘limida rozilik yoki rad javobini beradi.'],
  ['#b388ff', 'Hisobotlar', 'Fayl yoki rasm bilan hisobot yuboring, hamma ko‘rib izoh qoldira oladi.'],
  ['#3ddc97', 'Members statistikasi', 'Kim qachon qo‘shildi, qanday vazifa oldi va nechtasini bajardi.'],
];
const STEPS = [
  'Ro‘yxatdan o‘ting va emailingizni kod orqali tasdiqlang.',
  'Team Leader sifatida yangi loyiha oching.',
  'Members bo‘limida foydalanuvchilarni taklif qiling. Ular xabarlar (qo‘ng‘iroqcha) orqali taklifni qabul qiladi.',
  'ToDo’ga vazifa qo‘shing, ishchining ismini yozishni boshlasangiz kifoya.',
  'Ishchi vazifani Process’ga o‘tkazadi va hisobot yuboradi, karta Process Viewing’ga tushadi.',
  'Team Leader hisobotni qabul qilsa, kartani Done’ga sudrab o‘tkazadi. Rad etsa, karta Process’ga qaytadi.',
];

export default function Landing({ onLogin, onRegister }) {
  return (
    <div className="landing">
      <section className="hero">
        <span className="pill">Jamoaviy ish uchun</span>
        <h1>Vazifalar oqimi <em>bir joyda</em></h1>
        <p>Team Flow jamoa rahbari va ishchilar uchun vazifalarni taqsimlash, bajarilishini kuzatish va hisobotlarni ko‘rib chiqish platformasi. Barcha vaqtlar doimiy UTC+5 bo‘yicha ishlaydi.</p>
        <div className="cta">
          <button className="primary" onClick={onRegister}>Ro‘yxatdan o‘tish</button>
          <button className="ghost" onClick={onLogin}>Kirish</button>
        </div>
      </section>
      <section className="features">
        {FEATURES.map(([c, t, d]) => (
          <div key={t} className="panel feat" style={{ '--c': c }}><b>{t}</b><p>{d}</p></div>
        ))}
      </section>
      <section className="panel how">
        <h2>Qisqacha yo‘riqnoma</h2>
        <ol>{STEPS.map((s, i) => <li key={i}><span>{i + 1}</span>{s}</li>)}</ol>
      </section>
    </div>
  );
}
