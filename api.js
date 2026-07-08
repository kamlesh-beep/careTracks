const express = require('express');
const cors = require('cors');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeFirebase } = require('./firebase');

initializeFirebase();

const app = express();
const db = getFirestore();
const drivers = db.collection(process.env.FIREBASE_COLLECTION || 'drivers');
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/api/data', async (req, res, next) => {
  try {
    const snapshot = await drivers.get();
    res.json(Object.fromEntries(snapshot.docs.map((doc) => [doc.id, doc.data()])));
  } catch (error) {
    next(error);
  }
});

app.post('/api/save', async (req, res, next) => {
  try {
    const { driver, state } = req.body;
    if (!driver || typeof state === 'undefined') {
      return res.status(400).json({ ok: false, msg: 'Missing driver or state' });
    }

    await drivers.doc(driver).set(state);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/driver/:name', async (req, res, next) => {
  try {
    const snapshot = await drivers.doc(req.params.name).get();
    res.json(snapshot.exists ? snapshot.data() : null);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error('Firebase request failed:', error.message);
  res.status(500).json({ ok: false, msg: 'Database request failed' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT} with Firebase Firestore`);
});
