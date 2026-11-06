require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sql, getPool } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Упрощённая проверка авторизации
app.use(async (req, res, next) => {
  const token = req.headers['x-session-token'];
  if (!token) return next();
  try {
    const pool = await getPool();
    const r = await pool.request().input('t', sql.NVarChar, token)
      .query(`SELECT u.Id, u.Login, u.Fullname, u.Role FROM dbo.Sessions s JOIN dbo.Users u ON u.Id=s.UserId WHERE s.Token=@t`);
    if (r.recordset[0]) req.user = r.recordset[0];
  } catch (e) {}
  next();
});

// Логин
app.post('/api/login', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().input('l', sql.NVarChar, req.body.login).query('SELECT * FROM dbo.Users WHERE Login=@l');
    const user = r.recordset[0];
    if (!user || !(await bcrypt.compare(req.body.password, user.Password))) return res.json({ success: false, message: 'Неверный логин или пароль' });
    
    const token = crypto.randomBytes(24).toString('hex');
    await pool.request().input('t', sql.NVarChar, token).input('u', sql.Int, user.Id).input('e', sql.BigInt, Date.now() + 86400000)
      .query('INSERT INTO dbo.Sessions (Token,UserId,ExpiresAt) VALUES (@t,@u,@e)');
      
    res.json({ success: true, message: 'Успех', token, role: user.Role, user: { id: user.Id, login: user.Login, name: user.Fullname, role: user.Role }, redirect: user.Role === 'admin' ? 'admin.html' : 'profile.html' });
  } catch (e) { res.json({ success: false, message: e.message }); }
});

// Регистрация
app.post('/api/register', async (req, res) => {
  try {
    const pool = await getPool();
    const hash = await bcrypt.hash(req.body.password, 10);
    await pool.request().input('l', sql.NVarChar, req.body.login).input('p', sql.NVarChar, hash).input('f', sql.NVarChar, req.body.fullname).input('e', sql.NVarChar, req.body.email || '').input('ph', sql.NVarChar, req.body.phone || '')
      .query("INSERT INTO dbo.Users (Login,Password,Fullname,Email,Phone,Role) VALUES (@l,@p,@f,@e,@ph,'user')");
    res.json({ success: true, message: 'Регистрация успешна' });
  } catch (e) { res.json({ success: false, message: 'Ошибка: ' + e.message }); }
});

// Данные для админки
app.get('/api/all', async (req, res) => {
  try {
    const pool = await getPool();
    const [u, b] = await Promise.all([ pool.request().query('SELECT * FROM dbo.Users'), pool.request().query('SELECT * FROM dbo.Bookings') ]);
    res.json({ users: u.recordset, bookings: b.recordset, sessions: [], audit: [], messages: [], settings: [] });
  } catch (e) { res.json({ error: e.message }); }
});

// ---- СОХРАНЕНИЕ БРОНИ / КОНТАКТОВ ----
app.post('/api/bookings', async (req, res) => {
  try {
    const pool = await getPool();
    // Отправляем ровно то, что ждет база (Date, Name, Guests, Time, Email, Phone)
    await pool.request()
      .input('d', sql.NVarChar, req.body.date || 'Не указана')
      .input('n', sql.NVarChar, req.body.name || 'Без имени')
      .input('g', sql.Int, Number(req.body.guests) || 1)
      .input('tm', sql.NVarChar, req.body.time || '--:--')
      .input('e', sql.NVarChar, req.body.email || '')
      .input('p', sql.NVarChar, req.body.phone || '')
      .query('INSERT INTO dbo.Bookings ([Date],[Name],Guests,[Time],Email,Phone) VALUES (@d,@n,@g,@tm,@e,@p)');
      
    res.json({ success: true, message: 'Данные сохранены в БД!' });
  } catch (e) { res.json({ success: false, message: 'Ошибка БД: ' + e.message }); }
});

app.get('/api/me', (req, res) => res.json(req.user || {}));
app.post('/api/logout', (req, res) => res.json({ success: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`));