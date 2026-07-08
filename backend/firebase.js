const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');

function initializeFirebase() {
  if (getApps().length) return getApps()[0];

  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credential = rawServiceAccount
    ? cert(JSON.parse(rawServiceAccount))
    : applicationDefault();

  return initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || undefined
  });
}

module.exports = { initializeFirebase };
