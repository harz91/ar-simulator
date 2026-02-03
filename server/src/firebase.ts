import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

if (!admin.apps.length) {
  if (!serviceAccountJson) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is required");
  }
  if (!storageBucket) {
    throw new Error("FIREBASE_STORAGE_BUCKET is required");
  }

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
    storageBucket
  });
}

export const firestore = admin.firestore();
export const storage = admin.storage();
