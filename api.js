const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const DB_FILE = path.resolve(__dirname, 'rescue_data.json');
const PORT = process.env.PORT || 3001;

function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({}));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('readDB error:', err && err.message);
    return {};
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('writeDB error:', err && err.message);
    return false;
  }
}

// GET all data
app.get('/api/data', (req, res) => {
  const data = readDB();
  res.json(data);
});

// SAVE driver state
app.post('/api/save', (req, res) => {
  const { driver, state } = req.body;
  if (!driver || typeof state === 'undefined') {
    return res.status(400).json({ ok: false, msg: 'Missing driver or state' });
  }
  const data = readDB();
  data[driver] = state;
  const ok = writeDB(data);
  res.json({ ok });
});

// GET specific driver
app.get('/api/driver/:name', (req, res) => {
  const data = readDB();
  res.json(data[req.params.name] || null);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ API running on port ${PORT}`);
  console.log(`Dashboard: http://localhost:8000/rescue_dashboard.html`);
});
