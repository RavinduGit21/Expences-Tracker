const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const DB_FILE = path.join(__dirname, 'data', 'db.json');

function loadDB(){
  try{
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  }catch(e){
    return { users: {} };
  }
}

function saveDB(db){
  fs.mkdirSync(path.join(__dirname, 'data'), {recursive:true});
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let DB = loadDB();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// simple healthcheck/ping for frontend to test connectivity
app.get('/ping', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

function generateToken(username){
  return jwt.sign({username}, JWT_SECRET, {expiresIn: '7d'});
}

function authMiddleware(req, res, next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).send('Missing authorization');
  const parts = auth.split(' ');
  if(parts.length !== 2) return res.status(401).send('Invalid authorization');
  const token = parts[1];
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.username = payload.username;
    next();
  }catch(e){
    return res.status(401).send('Invalid token');
  }
}

app.post('/auth/register', async (req, res) => {
  const {username, password, name} = req.body || {};
  if(!username || !password) return res.status(400).send('username and password required');
  DB = loadDB();
  if(DB.users[username]) return res.status(400).send('User exists');
  const hash = await bcrypt.hash(password, 10);
  DB.users[username] = { passwordHash: hash, name: name || '', categories: ['Food','Transport','Utilities','Misc'], settings: {currency: 'USD', budget:0}, expenses: [], incomes: [] };
  saveDB(DB);
  const token = generateToken(username);
  const user = {...DB.users[username], username};
  delete user.passwordHash;
  res.json({token, user});
});

app.post('/auth/login', async (req, res) => {
  const {username, password} = req.body || {};
  if(!username || !password) return res.status(400).send('username and password required');
  DB = loadDB();
  const u = DB.users[username];
  if(!u) return res.status(400).send('User not found');
  const ok = await bcrypt.compare(password, u.passwordHash);
  if(!ok) return res.status(401).send('Invalid credentials');
  const token = generateToken(username);
  const user = {...u, username}; delete user.passwordHash;
  res.json({token, user});
});

app.get('/profile', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  if(!u) return res.status(404).send('User not found');
  const user = {...u, username: req.username}; delete user.passwordHash;
  res.json({user});
});

// Expenses
app.get('/expenses', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  res.json(u.expenses || []);
});

app.post('/expenses', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  const item = req.body;
  item.id = 'srv_' + Date.now();
  u.expenses = u.expenses || [];
  u.expenses.unshift(item);
  saveDB(DB);
  res.json(item);
});

app.put('/expenses/:id', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  const id = req.params.id;
  u.expenses = u.expenses || [];
  const idx = u.expenses.findIndex(x=>x.id===id);
  if(idx === -1) return res.status(404).send('Not found');
  u.expenses[idx] = {...u.expenses[idx], ...req.body};
  saveDB(DB);
  res.json(u.expenses[idx]);
});

app.delete('/expenses/:id', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  const id = req.params.id;
  u.expenses = (u.expenses||[]).filter(x=>x.id!==id);
  saveDB(DB);
  res.json({ok:true});
});

// Incomes
app.get('/incomes', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  res.json(u.incomes || []);
});

app.post('/incomes', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  const item = req.body;
  item.id = 'srv_' + Date.now();
  u.incomes = u.incomes || [];
  u.incomes.unshift(item);
  saveDB(DB);
  res.json(item);
});

app.put('/incomes/:id', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  const id = req.params.id;
  u.incomes = u.incomes || [];
  const idx = u.incomes.findIndex(x=>x.id===id);
  if(idx === -1) return res.status(404).send('Not found');
  u.incomes[idx] = {...u.incomes[idx], ...req.body};
  saveDB(DB);
  res.json(u.incomes[idx]);
});

app.delete('/incomes/:id', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  const id = req.params.id;
  u.incomes = (u.incomes||[]).filter(x=>x.id!==id);
  saveDB(DB);
  res.json({ok:true});
});

app.put('/settings', authMiddleware, (req, res) => {
  DB = loadDB();
  const u = DB.users[req.username];
  // Persist settings and allow updating categories if provided
  u.settings = req.body || {};
  if(req.body && Array.isArray(req.body.categories)){
    u.categories = req.body.categories;
  }
  // Also allow saving salary or other top-level settings into u.settings
  saveDB(DB);
  const resp = { settings: u.settings, categories: u.categories };
  res.json(resp);
});

app.listen(PORT, ()=>{
  console.log('Server listening on port', PORT);
});

// DEV: seed a demo user if not present (username: demo, password: password)
try{
  DB = loadDB();
  if(!DB.users) DB.users = {};
  if(!DB.users['demo']){
    const demoHash = bcrypt.hashSync('password', 10);
    DB.users['demo'] = {
      passwordHash: demoHash,
      name: 'Demo User',
      categories: ['Food','Transport','Utilities','Misc'],
      settings: { currency: 'USD', budget: 0 },
      expenses: [],
      incomes: []
    };
    saveDB(DB);
    console.log('DEV: created demo user -> username: demo password: password');
  }
}catch(e){ console.warn('DEV seed failed', e && e.message); }
