import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  Auth
} from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, orderBy, getDocFromServer, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { mockAuth, mockLoginWithEmail, mockLogout, MOCK_USER_PROFILE, MockUser } from './mockAuth';

let _useMock = false;

// Helper to check if config is valid (not placeholders)
const isConfigValid = firebaseConfig && 
  firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes('remixed') &&
  firebaseConfig.projectId && 
  !firebaseConfig.projectId.includes('remixed');

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export const googleProvider = new GoogleAuthProvider();

export { db, auth };

export function onAuthStateChangedSafe(
  callback: (user: any) => void
): () => void {
  if (_useMock || !auth) {
    return mockAuth.onAuthStateChanged(callback);
  }
  const { onAuthStateChanged } = require('firebase/auth') as typeof import('firebase/auth');
  return onAuthStateChanged(auth, callback);
}

export function activateMock() {
  _useMock = true;
}

// Error Handling Infrastructure
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function ensureAuth() {
  if (!auth) {
    throw new Error('Firebase Auth is not initialized. Please complete the Firebase setup.');
  }
  return auth;
}

function ensureDb() {
  if (!db) {
    throw new Error('Firebase Firestore is not initialized. Please complete the Firebase setup.');
  }
  return db;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentAuth = auth;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuth?.currentUser?.uid,
      email: currentAuth?.currentUser?.email,
      emailVerified: currentAuth?.currentUser?.emailVerified,
      isAnonymous: currentAuth?.currentUser?.isAnonymous,
      tenantId: currentAuth?.currentUser?.tenantId,
      providerInfo: currentAuth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check
async function testConnection() {
  if (!isConfigValid || !db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export async function loginWithGoogle() {
  const currentAuth = ensureAuth();
  try {
    const result = await signInWithPopup(currentAuth, googleProvider);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain') {
      _useMock = true;
      const err: any = new Error('Login com Google indisponível neste domínio. Use e-mail e senha.');
      err.code = 'auth/unauthorized-domain';
      throw err;
    }
    throw error;
  }
}

export async function registerWithEmail(email: string, pass: string, name: string) {
  const currentAuth = ensureAuth();
  try {
    const result = await createUserWithEmailAndPassword(currentAuth, email, pass);
    await updateProfile(result.user, { displayName: name });
    return result.user;
  } catch (error) {
    throw error;
  }
}

export async function loginWithEmail(email: string, pass: string) {
  if (_useMock) {
    return mockLoginWithEmail(email, pass);
  }
  const currentAuth = ensureAuth();
  try {
    const result = await signInWithEmailAndPassword(currentAuth, email, pass);
    return result.user;
  } catch (error: any) {
    if (error?.code === 'auth/unauthorized-domain') {
      _useMock = true;
      return mockLoginWithEmail(email, pass);
    }
    throw error;
  }
}

export async function resetPassword(email: string) {
  const currentAuth = ensureAuth();
  try {
    await sendPasswordResetEmail(currentAuth, email);
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  if (_useMock) {
    return mockLogout();
  }
  const currentAuth = ensureAuth();
  await signOut(currentAuth);
}

export async function updateUserPassword(newPass: string) {
  const currentAuth = ensureAuth();
  if (!currentAuth.currentUser) throw new Error("No user logged in");
  try {
    await updatePassword(currentAuth.currentUser, newPass);
  } catch (error) {
    throw error;
  }
}

export async function reauthenticate(password: string) {
  const currentAuth = ensureAuth();
  const user = currentAuth.currentUser;
  if (!user || !user.email) throw new Error("No user or email");
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
}

export interface UserProfile {
  displayName: string | null;
  email: string;
  geminiApiKey: string | null;
  plan: 'free' | 'basico' | 'pro' | 'enterprise';
  usageCount: number;
  nfeDigits?: number; // Configuração dinâmica de dígitos NF-e
  createdAt: any;
  updatedAt: any;
}

export interface UserProfileWithId extends UserProfile {
  id: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const currentDb = ensureDb();
  const path = `users/${userId}`;
  try {
    const userDoc = await getDoc(doc(currentDb, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function getAllUsers(): Promise<UserProfileWithId[]> {
  const currentDb = ensureDb();
  const path = 'users';
  try {
    const usersRef = collection(currentDb, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserProfileWithId));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createUserProfile(userId: string, data: Partial<UserProfile>) {
  const currentDb = ensureDb();
  const path = `users/${userId}`;
  try {
    const userRef = doc(currentDb, 'users', userId);
    await setDoc(userRef, {
      ...data,
      geminiApiKey: null,
      plan: 'free',
      usageCount: 0,
      nfeDigits: 6, // Default para 6 dígitos conforme solicitado
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateGeminiApiKey(userId: string, key: string) {
  const currentDb = ensureDb();
  const path = `users/${userId}`;
  try {
    const userRef = doc(currentDb, 'users', userId);
    await updateDoc(userRef, {
      geminiApiKey: key,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateNfeDigits(userId: string, digits: number) {
  const currentDb = ensureDb();
  const path = `users/${userId}`;
  try {
    const userRef = doc(currentDb, 'users', userId);
    await updateDoc(userRef, {
      nfeDigits: digits,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updatePlan(userId: string, plan: 'free' | 'basico' | 'pro' | 'enterprise') {
  const currentDb = ensureDb();
  const path = `users/${userId}`;
  try {
    const userRef = doc(currentDb, 'users', userId);
    await updateDoc(userRef, {
      plan,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface PlanSettings {
  price: string;
  description: string;
}

export async function getPlanSettings(): Promise<Record<string, PlanSettings>> {
  if (!db) return {}; // Not initialized yet, return empty for safety
  const currentDb = ensureDb();
  const path = 'plan_settings';
  try {
    const querySnapshot = await getDocs(collection(currentDb, 'plan_settings'));
    const settings: Record<string, PlanSettings> = {};
    querySnapshot.forEach((doc) => {
      settings[doc.id] = doc.data() as PlanSettings;
    });
    return settings;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return {};
  }
}

export async function updateProfileData(userId: string, data: Partial<UserProfile>) {
  const currentDb = ensureDb();
  const path = `users/${userId}`;
  try {
    const userRef = doc(currentDb, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updatePlanSettings(planId: string, settings: Partial<PlanSettings>) {
  const currentDb = ensureDb();
  const path = `plan_settings/${planId}`;
  try {
    const planRef = doc(currentDb, 'plan_settings', planId);
    const planDoc = await getDoc(planRef);
    if (planDoc.exists()) {
      await updateDoc(planRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });
    } else {
      // If it doesn't exist, we must provide defaults to satisfy rules
      await setDoc(planRef, {
        price: '',
        description: '',
        ...settings,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function incrementUsage(userId: string) {
  const currentDb = ensureDb();
  const path = `users/${userId}`;
  try {
    const userRef = doc(currentDb, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const currentUsage = (userDoc.data() as UserProfile).usageCount || 0;
      await updateDoc(userRef, {
        usageCount: currentUsage + 1,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
