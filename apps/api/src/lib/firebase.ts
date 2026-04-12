import admin from "firebase-admin";

const getFirebaseApp = () => {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
};

export const firebaseApp = getFirebaseApp();
export const firebaseAuth = firebaseApp.auth();

export async function verifyFirebaseToken(idToken: string) {
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      phone: decodedToken.phone_number,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error("Firebase token verification failed:", error);
    return null;
  }
}
