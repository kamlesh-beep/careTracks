# Firebase setup

CareTracks now stores driver state in Cloud Firestore. Each driver is a document in the `drivers` collection. The browser still uses the same `/api` endpoints, so no Firebase credentials are exposed to the frontend.

## 1. Create Firebase resources

1. Create or select a project in the Firebase console.
2. Open **Build > Firestore Database** and create a database.
3. In **Project settings > Service accounts**, generate a new private key.
4. Keep that JSON key outside this repository. Never commit it.

## 2. Configure the backend (PowerShell)

```powershell
$env:FIREBASE_PROJECT_ID = "your-project-id"
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secure\path\service-account.json"
npm install
npm start
```

Instead of a file, hosted environments can set `FIREBASE_SERVICE_ACCOUNT` to the complete service-account JSON string. `FIREBASE_COLLECTION` is optional and defaults to `drivers`.

## 3. Import the existing JSON once

With the same environment variables set:

```powershell
npm run migrate:firebase
```

The import uses document IDs as driver names and overwrites matching driver documents. It does not delete any other Firestore documents.

## 4. Run the frontend

```powershell
cd frontend
npm install
npm run dev
```

The Vite development proxy forwards `/api` requests to the backend on port 3001.

## Deployment notes

- Set the Firebase environment variables on the backend host, not in frontend/Vite variables.
- The service account needs Firestore read/write access.
- Firestore documents have a 1 MiB size limit. The current app stores uploaded images inside a driver's state, so use small/compressed images. For unrestricted photo sizes, move photos to Firebase Storage and keep only their URLs in Firestore.
