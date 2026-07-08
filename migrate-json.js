const fs = require('fs');
const path = require('path');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeFirebase } = require('./firebase');

async function migrate() {
  initializeFirebase();
  const file = process.argv[2] || path.resolve(__dirname, 'rescue_data.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const collection = getFirestore().collection(process.env.FIREBASE_COLLECTION || 'drivers');
  const entries = Object.entries(data);

  for (let offset = 0; offset < entries.length; offset += 500) {
    const batch = getFirestore().batch();
    entries.slice(offset, offset + 500).forEach(([driver, state]) => {
      batch.set(collection.doc(driver), state);
    });
    await batch.commit();
  }

  console.log(`Migrated ${entries.length} driver records to Firestore.`);
}

migrate().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exitCode = 1;
});
