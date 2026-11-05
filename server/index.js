import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import multer from 'multer';
import cors from 'cors';
import dns from 'dns/promises';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOADS, { recursive: true });
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const PORT = process.env.PORT || 5000;

// ---------- Modellar ----------
const { Schema, model, Types } = mongoose;
const User = model('User', new Schema({
  email: { type: String, unique: true, required: true, lowercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  avatar: String,
  password: String,
  verified: { type: Boolean, default: false },
  code: String,
  codeExp: Date,
  tries: { type: Number, default: 0 },
}, { timestamps: true }));
const Project = model('Project', new Schema({
  name: { type: String, required: true },
  description: String,
  leader: { type: String, required: true },
  members: [String],
}, { timestamps: true }));
const Invite = model('Invite', new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  from: String, to: { type: String, index: true },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  respondedAt: Date,
}, { timestamps: true }));
const Notification = model('Notification', new Schema({
  user: { type: String, index: true }, type: String, text: String,
  project: { type: Schema.Types.ObjectId, ref: 'Project' },
  invite: { type: Schema.Types.ObjectId, ref: 'Invite' },
  read: { type: Boolean, default: false },
}, { timestamps: true }));
const Task = model('Task', new Schema({
  project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  title: { type: String, required: true },
  description: String,
  assignee: { type: String, required: true },
  status: { type: String, enum: ['todo', 'processing', 'viewing', 'done'], default: 'todo' },
}, { timestamps: true }));
const Report = model('Report', new Schema({
  task: { type: Schema.Types.ObjectId, ref: 'Task' },
  project: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
  author: String, authorName: String, leader: String,
  text: String,
  file: { name: String, url: String, mime: String },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  comments: [{ author: String, authorName: String, text: String, at: { type: Date, default: Date.now } }],
}, { timestamps: true }));

const notify = (user, type, text, extra = {}) => Notification.create({ user, type, text, ...extra }).catch(() => {});

// ---------- Email ----------
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: +process.env.SMTP_PORT || 465,
  secure: (+process.env.SMTP_PORT || 465) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
}) : null;

async function sendMail(to, subject, text) {
  if (!transporter) { console.log(`\n[EMAIL -> ${to}] ${subject}\n${text}\n`); return; }
  await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}

async function isRealEmail(email) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;
  try { return (await dns.resolveMx(email.split('@')[1])).length > 0; }
  catch { return false; }
}

async function issueCode(user, subject = 'Team Flow: tasdiqlash kodi') {
  const code = String(crypto.randomInt(100000, 1000000));
  user.code = code; user.tries = 0; user.codeExp = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();
  await sendMail(user.email, subject, `Sizning tasdiqlash kodingiz: ${code}\nKod 10 daqiqa amal qiladi.`);
}

// ---------- Yordamchilar ----------
const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS));

const wrap = fn => (req, res) => fn(req, res).catch(e => {
  console.error(e); res.status(e.status || 500).json({ error: e.message || 'Server xatosi' });
});
const fail = (status, message) => Object.assign(new Error(message), { status });
const oid = id => { if (!Types.ObjectId.isValid(id)) throw fail(400, "Noto'g'ri ID"); return id; };

function guard(handler) {
  return (req, res) => {
    const t = (req.headers.authorization || '').replace('Bearer ', '');
    let email; try { email = jwt.verify(t, SECRET).email; } catch {}
    if (!email) return res.status(401).json({ error: 'Avval tizimga kiring' });
    User.findOne({ email }).then(u => {
      if (!u) return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
      req.user = u;
      return handler(req, res);
    }).catch(e => { console.error(e); res.status(e.status || 500).json({ error: e.message || 'Server xatosi' }); });
  };
}
const h = fn => guard(wrap(fn));

async function projectFor(user, id) {
  const p = await Project.findById(oid(id));
  if (!p) throw fail(404, 'Loyiha topilmadi');
  if (p.leader !== user.email && !p.members.includes(user.email)) throw fail(403, "Bu loyihaga ruxsatingiz yo'q");
  return p;
}
const token = u => jwt.sign({ email: u.email }, SECRET, { expiresIn: '7d' });
const pub = u => ({ email: u.email, name: u.name, avatar: u.avatar || null });

// ---------- Auth ----------
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, password } = req.body;
  const email = (req.body.email || '').toLowerCase().trim();
  if (!name || !password || password.length < 6) throw fail(400, "Ism va kamida 6 belgili parol kiriting");
  if (!(await isRealEmail(email))) throw fail(400, "Bu haqiqiy email manzil emas. Mavjud email kiriting");
  let u = await User.findOne({ email });
  if (u?.verified) throw fail(409, "Bu email allaqachon ro'yxatdan o'tgan");
  if (!u) u = new User({ email });
  u.name = name; u.password = await bcrypt.hash(password, 10);
  await issueCode(u);
  res.json({ ok: true, message: 'Tasdiqlash kodi emailingizga yuborildi' });
}));

app.post('/api/auth/verify', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || !u.code || u.code !== String(req.body.code).trim() || u.codeExp < new Date()) throw fail(400, "Kod noto'g'ri yoki muddati tugagan");
  u.verified = true; u.code = undefined; u.codeExp = undefined; await u.save();
  res.json({ token: token(u), user: pub(u) });
}));

app.post('/api/auth/resend', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!u || u.verified) throw fail(400, 'Email topilmadi yoki allaqachon tasdiqlangan');
  await issueCode(u); res.json({ ok: true });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();
  const u = await User.findOne({ email });
  if (!u || !(await bcrypt.compare(req.body.password || '', u.password || ''))) throw fail(401, "Email yoki parol noto'g'ri");
  if (!u.verified) { await issueCode(u); return res.status(403).json({ error: 'Email tasdiqlanmagan. Yangi kod yuborildi', needVerify: true }); }
  res.json({ token: token(u), user: pub(u) });
}));

app.post('/api/auth/forgot', wrap(async (req, res) => {
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
  if (u && u.verified) await issueCode(u, 'Team Flow: parolni tiklash kodi');
  res.json({ ok: true, message: "Agar bu email ro'yxatdan o'tgan bo'lsa, tasdiqlash kodi yuborildi" });
}));

app.post('/api/auth/reset', wrap(async (req, res) => {
  const { password } = req.body;
  const u = await User.findOne({ email: (req.body.email || '').toLowerCase().trim() });
  if (!password || password.length < 6) throw fail(400, "Yangi parol kamida 6 belgidan iborat bo'lsin");
  if (!u || !u.verified || !u.code || u.codeExp < new Date()) throw fail(400, "Kod noto'g'ri yoki muddati tugagan. Yangi kod so'rang");
  if (u.code !== String(req.body.code).trim()) {
    u.tries += 1;
    if (u.tries >= 5) { u.code = undefined; u.codeExp = undefined; }
    await u.save();
    throw fail(400, u.tries >= 5 ? "Juda ko'p xato urinish. Yangi kod so'rang" : "Kod noto'g'ri");
  }
  u.password = await bcrypt.hash(password, 10);
  u.code = undefined; u.codeExp = undefined; u.tries = 0; await u.save();
  res.json({ token: token(u), user: pub(u) });
}));

app.get('/api/me', h(async (req, res) => res.json({ user: pub(req.user) })));

// ---------- Fayl yuklash ----------
const storage = multer.diskStorage({
  destination: UPLOADS,
  filename: (_, f, cb) => cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + path.extname(f.originalname)),
});
const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });
const avatarUpload = multer({
  storage, limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_, f, cb) => cb(f.mimetype.startsWith('image/') ? null : new Error('Avatar uchun faqat rasm yuklang'), f.mimetype.startsWith('image/')),
});
const multipart = (mw, handler) => guard((req, res) => new Promise(resolve => {
  mw(req, res, async err => {
    try { if (err) throw fail(400, err.message); await handler(req, res); }
    catch (e) { res.status(e.status || 500).json({ error: e.message }); }
    resolve();
  });
}));

// ---------- Profil va foydalanuvchilar ----------
app.patch('/api/profile', multipart(avatarUpload.single('avatar'), async (req, res) => {
  if (req.body.name !== undefined) {
    if (!req.body.name.trim()) throw fail(400, 'Ism bo\'sh bo\'lmasin');
    req.user.name = req.body.name.trim();
  }
  if (req.file) req.user.avatar = '/uploads/' + req.file.filename;
  await req.user.save();
  res.json({ user: pub(req.user) });
}));

// Ro'yxatdan o'tgan barcha foydalanuvchilar (Team Leader taklif yuborishi uchun)
app.get('/api/users', h(async (req, res) => {
  const q = String(req.query.q || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter = { verified: true, email: { $ne: req.user.email } };
  if (q) filter.$or = [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }];
  res.json((await User.find(filter).sort('name').limit(100)).map(pub));
}));

// ---------- Xabarlar (notifications) ----------
app.get('/api/notifications', h(async (req, res) => {
  const items = await Notification.find({ user: req.user.email }).sort('-createdAt').limit(50).populate('invite', 'status');
  res.json({ items, unread: await Notification.countDocuments({ user: req.user.email, read: false }) });
}));
app.post('/api/notifications/read', h(async (req, res) => {
  await Notification.updateMany({ user: req.user.email, read: false }, { read: true }); res.json({ ok: true });
}));

// ---------- Loyihalar ----------
app.get('/api/projects', h(async (req, res) => {
  const e = req.user.email;
  res.json(await Project.find({ $or: [{ leader: e }, { members: e }] }).sort('-createdAt'));
}));

app.post('/api/projects', h(async (req, res) => {
  if (!req.body.name?.trim()) throw fail(400, 'Loyiha nomini kiriting');
  res.json(await Project.create({ name: req.body.name.trim(), description: req.body.description, leader: req.user.email, members: [] }));
}));

app.get('/api/projects/:id', h(async (req, res) => {
  const project = await projectFor(req.user, req.params.id);
  const isLeader = project.leader === req.user.email;
  const [tasks, reports, us, acc, invites] = await Promise.all([
    Task.find({ project: project._id }).sort('createdAt'),
    Report.find({ project: project._id }).sort('-createdAt'),
    User.find({ email: { $in: [project.leader, ...project.members] } }),
    Invite.find({ project: project._id, status: 'accepted' }),
    isLeader ? Invite.find({ project: project._id }).sort('-createdAt') : [],
  ]);
  res.json({
    project, tasks, reports, invites,
    users: Object.fromEntries(us.map(u => [u.email, pub(u)])),
    joined: Object.fromEntries(acc.map(i => [i.to, i.respondedAt])),
  });
}));

// ---------- Takliflar ----------
app.post('/api/projects/:id/invites', h(async (req, res) => {
  const project = await projectFor(req.user, req.params.id);
  if (project.leader !== req.user.email) throw fail(403, 'Faqat Team Leader taklif yubora oladi');
  const to = (req.body.email || '').toLowerCase().trim();
  const target = await User.findOne({ email: to, verified: true });
  if (!target) throw fail(400, "Bunday foydalanuvchi topilmadi");
  if (to === project.leader || project.members.includes(to)) throw fail(400, "Bu foydalanuvchi allaqachon guruhda");
  if (await Invite.exists({ project: project._id, to, status: 'pending' })) throw fail(400, 'Taklif allaqachon yuborilgan, javob kutilmoqda');
  const inv = await Invite.create({ project: project._id, from: req.user.email, to });
  await notify(to, 'invite', `${req.user.name} sizni "${project.name}" loyihasiga taklif qildi`, { project: project._id, invite: inv._id });
  res.json(inv);
}));

app.patch('/api/invites/:id', h(async (req, res) => {
  const inv = await Invite.findById(oid(req.params.id));
  if (!inv || inv.to !== req.user.email) throw fail(404, 'Taklif topilmadi');
  if (inv.status !== 'pending') throw fail(400, 'Bu taklifga allaqachon javob berilgan');
  const d = req.body.decision;
  if (!['accepted', 'rejected'].includes(d)) throw fail(400, 'Qaror xato');
  const project = await Project.findById(inv.project);
  inv.status = d; inv.respondedAt = new Date(); await inv.save();
  if (project) {
    if (d === 'accepted' && !project.members.includes(inv.to)) { project.members.push(inv.to); await project.save(); }
    await notify(project.leader, 'invite_response', `${req.user.name} "${project.name}" loyihasiga taklifni ${d === 'accepted' ? 'qabul qildi' : 'rad etdi'}`, { project: project._id });
  }
  res.json(inv);
}));

// ---------- Vazifalar ----------
app.post('/api/projects/:id/tasks', h(async (req, res) => {
  const project = await projectFor(req.user, req.params.id);
  if (project.leader !== req.user.email) throw fail(403, 'Faqat Team Leader vazifa bera oladi');
  const assignee = (req.body.assignee || '').toLowerCase().trim();
  if (!req.body.title?.trim()) throw fail(400, 'Vazifa nomini kiriting');
  if (assignee !== project.leader && !project.members.includes(assignee))
    throw fail(400, "Bu foydalanuvchi guruh a'zosi emas. Avval Members bo'limida taklif yuboring");
  const task = await Task.create({ project: project._id, title: req.body.title.trim(), description: req.body.description, assignee });
  if (assignee !== req.user.email) await notify(assignee, 'task', `Sizga yangi vazifa berildi: "${task.title}" (${project.name})`, { project: project._id });
  res.json(task);
}));

app.patch('/api/tasks/:id/status', h(async (req, res) => {
  const task = await Task.findById(oid(req.params.id));
  if (!task) throw fail(404, 'Vazifa topilmadi');
  const project = await projectFor(req.user, task.project);
  const to = req.body.status, isLeader = project.leader === req.user.email;
  if (!['todo', 'processing', 'viewing', 'done'].includes(to)) throw fail(400, 'Holat xato');
  if (!isLeader && !(task.assignee === req.user.email && task.status === 'todo' && to === 'processing'))
    throw fail(403, "Bu vazifani ko'chirishga ruxsatingiz yo'q");
  if (to === 'done' && !(await Report.exists({ task: task._id, status: 'accepted' })))
    throw fail(400, "Done ga o'tkazish uchun avval hisobotni qabul qiling");
  task.status = to; await task.save(); res.json(task);
}));

app.delete('/api/tasks/:id', h(async (req, res) => {
  const task = await Task.findById(oid(req.params.id));
  if (!task) throw fail(404, 'Vazifa topilmadi');
  const project = await projectFor(req.user, task.project);
  if (project.leader !== req.user.email) throw fail(403, 'Faqat Team Leader');
  await Task.deleteOne({ _id: task._id }); await Report.deleteMany({ task: task._id }); res.json({ ok: true });
}));

// ---------- Hisobotlar ----------
app.post('/api/tasks/:id/reports', multipart(upload.single('file'), async (req, res) => {
  const task = await Task.findById(oid(req.params.id));
  if (!task) throw fail(404, 'Vazifa topilmadi');
  const project = await projectFor(req.user, task.project);
  if (task.assignee !== req.user.email) throw fail(403, 'Faqat vazifa olgan ishchi hisobot yubora oladi');
  if (task.status === 'done') throw fail(400, 'Bu vazifa allaqachon bajarilgan');
  if (await Report.exists({ task: task._id, status: 'pending' })) throw fail(400, "Oldingi hisobot hali ko'rib chiqilmagan");
  const leader = (req.body.leader || '').toLowerCase().trim();
  if (leader !== project.leader) throw fail(400, "Team Leader emailini to'g'ri belgilang");
  if (!req.body.text?.trim() && !req.file) throw fail(400, 'Hisobot matni yoki fayl kiriting');
  const r = await Report.create({
    task: task._id, project: project._id, author: req.user.email, authorName: req.user.name, leader,
    text: req.body.text?.trim(),
    file: req.file ? { name: req.file.originalname, url: '/uploads/' + req.file.filename, mime: req.file.mimetype } : undefined,
  });
  task.status = 'viewing'; await task.save();
  await notify(leader, 'report', `${req.user.name} "${task.title}" vazifasi bo'yicha hisobot yubordi`, { project: project._id });
  sendMail(leader, `Team Flow: yangi hisobot — ${task.title}`, `${req.user.name} (${req.user.email}) "${task.title}" vazifasi bo'yicha hisobot yubordi.`).catch(() => {});
  res.json(r);
}));

app.post('/api/reports/:id/comments', h(async (req, res) => {
  const r = await Report.findById(oid(req.params.id));
  if (!r) throw fail(404, 'Hisobot topilmadi');
  await projectFor(req.user, r.project);
  if (!req.body.text?.trim()) throw fail(400, 'Komment yozing');
  r.comments.push({ author: req.user.email, authorName: req.user.name, text: req.body.text.trim() });
  await r.save(); res.json(r);
}));

app.patch('/api/reports/:id/review', h(async (req, res) => {
  const r = await Report.findById(oid(req.params.id));
  if (!r) throw fail(404, 'Hisobot topilmadi');
  const project = await projectFor(req.user, r.project);
  if (project.leader !== req.user.email) throw fail(403, "Faqat Team Leader ko'rib chiqadi");
  if (!['accepted', 'rejected'].includes(req.body.decision)) throw fail(400, 'Qaror xato');
  r.status = req.body.decision; await r.save();
  const task = await Task.findById(r.task);
  // Rad etilsa vazifa Process ustuniga qaytadi
  if (task && r.status === 'rejected' && task.status === 'viewing') { task.status = 'processing'; await task.save(); }
  const word = r.status === 'accepted' ? 'qabul qilindi' : 'rad etildi';
  await notify(r.author, 'review', `"${task?.title}" vazifasi bo'yicha hisobotingiz ${word}`, { project: project._id });
  sendMail(r.author, `Team Flow: hisobotingiz ${word}`, `"${task?.title}" vazifasi bo'yicha hisobotingiz ${word}.`).catch(() => {});
  res.json(r);
}));

// ---------- Production: client/dist ni xizmat qilish ----------
const dist = path.join(__dirname, '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|uploads).*/, (_, res) => res.sendFile(path.join(dist, 'index.html')));
}

if (!process.env.MONGO_URI) { console.error('MONGO_URI topilmadi!'); process.exit(1); }
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected!');
    await Task.updateMany({ status: 'approved' }, { $set: { status: 'done' } }).catch(() => {}); // eski holatni yangisiga
    app.listen(PORT, () => console.log(`Team Flow server started on port ${PORT}`));
  })
  .catch(error => { console.error('MongoDB error:', error); process.exit(1); });
