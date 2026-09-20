import { initializeApp, getApps } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
  type User,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  type Query,
  type DocumentData,
} from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import type {
  AgentProfile,
  Presence,
  GalleryPost,
  TeamInvite,
  Team,
  Message,
  LeaderboardEntry,
  Category,
} from "./types";

const env = import.meta.env;
const configured = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 2 &&
  !/^(your[-_ ]|replace|placeholder|todo|<)/i.test(value);
export const firebaseReady = [
  env.VITE_FIREBASE_API_KEY,
  env.VITE_FIREBASE_AUTH_DOMAIN,
  env.VITE_FIREBASE_PROJECT_ID,
  env.VITE_FIREBASE_APP_ID,
].every(configured);
const app = firebaseReady
  ? getApps()[0] ||
    initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      databaseURL: configured(env.VITE_FIREBASE_DATABASE_URL)
        ? env.VITE_FIREBASE_DATABASE_URL
        : undefined,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    })
  : null;
export const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const functions = app
  ? getFunctions(app, env.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1")
  : null;
const useEmulators = env.DEV && env.VITE_USE_FIREBASE_EMULATORS === "true";
if (app && auth && db && functions) {
  if (useEmulators) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  } else if (configured(env.VITE_FIREBASE_APPCHECK_SITE_KEY)) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.VITE_FIREBASE_APPCHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  }
}
function needAuth() {
  if (!auth)
    throw new Error(
      "Firebase is not configured. Explore the preview or connect your project.",
    );
  return auth;
}
function needDb() {
  if (!db) throw new Error("Firebase is not configured.");
  return db;
}
export function onAuth(callback: (user: User | null) => void) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return (await signInWithPopup(needAuth(), provider)).user;
}
export function authErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    "auth/popup-blocked": "Your browser blocked Google’s sign-in window. Allow pop-ups for this site, then select Continue with Google again.",
    "auth/popup-closed-by-user": "Google sign-in was closed before it finished. Select Continue with Google to try again.",
    "auth/cancelled-popup-request": "A Google sign-in window is already open. Finish signing in there, or close it and try again.",
    "auth/unauthorized-domain": "This address is not enabled for Google sign-in. Add this hostname to Firebase Authentication → Settings → Authorized domains, then try again.",
    "auth/operation-not-allowed": "Google sign-in is not enabled for this Firebase project. Enable Google in Authentication → Sign-in method.",
    "auth/network-request-failed": "Couldn’t reach Google sign-in. Check your connection and try again.",
    "auth/invalid-credential": "The email or password is incorrect. Try again or reset your password.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment before trying again.",
    "auth/account-exists-with-different-credential": "This email already uses another sign-in method. Log in with that method first.",
  };
  return (code && messages[code]) || (error instanceof Error ? error.message : "Sign-in didn’t finish. Please try again.");
}
export async function signUpEmail(email: string, password: string) {
  const credential = await createUserWithEmailAndPassword(
    needAuth(),
    email.trim(),
    password,
  );
  await sendEmailVerification(credential.user);
  return credential.user;
}
export async function signInEmail(email: string, password: string) {
  return (await signInWithEmailAndPassword(needAuth(), email.trim(), password))
    .user;
}
export async function recoverPassword(email: string) {
  await sendPasswordResetEmail(needAuth(), email.trim());
}
export async function resendVerification() {
  const user = needAuth().currentUser;
  if (!user) throw new Error("Sign in first.");
  if (!user.emailVerified) await sendEmailVerification(user);
}
export async function refreshUser() {
  const user = needAuth().currentUser;
  if (!user) return null;
  await user.reload();
  await user.getIdToken(true);
  return user;
}
export async function logOut() {
  await signOut(needAuth());
}
export async function callAction<T = Record<string, unknown>>(
  name: string,
  data: unknown = {},
): Promise<T> {
  if (!functions)
    throw new Error(
      "Connect Firebase to use live accounts, rankings, and community features.",
    );
  const result = await httpsCallable<unknown, T>(functions, name)(data);
  return result.data;
}
type ErrorCallback = (error: Error) => void;
const defaultError: ErrorCallback = (error) =>
  console.warn("AI Space subscription unavailable:", error.name);
function watchRows<T>(
  source: Query<DocumentData>,
  callback: (rows: T[]) => void,
  onError: ErrorCallback = defaultError,
) {
  return onSnapshot(
    source,
    (snapshot) =>
      callback(
        snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T),
      ),
    onError,
  );
}
export function watchProfile(
  uid: string,
  callback: (profile: AgentProfile | null) => void,
  onError: ErrorCallback = defaultError,
) {
  return onSnapshot(
    doc(needDb(), "profiles", uid),
    (snapshot) =>
      callback(snapshot.exists() ? (snapshot.data() as AgentProfile) : null),
    onError,
  );
}
export function watchAccount(
  uid: string,
  callback: (account: { analyticsConsent?: boolean } | null) => void,
  onError: ErrorCallback = defaultError,
) {
  return onSnapshot(
    doc(needDb(), "accounts", uid),
    (snapshot) => callback(snapshot.exists() ? snapshot.data() : null),
    onError,
  );
}
export function watchPresence(
  callback: (people: Presence[]) => void,
  onError?: ErrorCallback,
) {
  let current: Presence[] = [];
  const emit = () =>
    callback(
      current.filter((person) => person.updatedAt > Date.now() - 120_000),
    );
  const unsubscribe = watchRows<Presence>(
    query(
      collection(needDb(), "presence"),
      orderBy("updatedAt", "desc"),
      limit(60),
    ),
    (rows) => {
      current = rows;
      emit();
    },
    onError,
  );
  const timer = window.setInterval(emit, 30_000);
  return () => {
    unsubscribe();
    window.clearInterval(timer);
  };
}
export function watchGallery(
  callback: (posts: GalleryPost[]) => void,
  onError?: ErrorCallback,
) {
  return watchRows<GalleryPost>(
    query(
      collection(needDb(), "gallery"),
      where("status", "==", "published"),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
    callback,
    onError,
  );
}
export function watchOwnGallery(
  uid: string,
  callback: (posts: GalleryPost[]) => void,
  onError?: ErrorCallback,
) {
  return watchRows<GalleryPost>(
    query(
      collection(needDb(), "gallery"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
    callback,
    onError,
  );
}
export function watchInvites(
  uid: string,
  callback: (invites: TeamInvite[]) => void,
  onError?: ErrorCallback,
) {
  return watchRows<TeamInvite>(
    query(
      collection(needDb(), "invites"),
      where("participants", "array-contains", uid),
      orderBy("createdAt", "desc"),
      limit(50),
    ),
    callback,
    onError,
  );
}
export function watchTeams(
  uid: string,
  callback: (teams: Team[]) => void,
  onError?: ErrorCallback,
) {
  return watchRows<Team>(
    query(
      collection(needDb(), "teams"),
      where("members", "array-contains", uid),
      limit(50),
    ),
    callback,
    onError,
  );
}
export function watchMessages(
  teamId: string,
  callback: (messages: Message[]) => void,
  onError?: ErrorCallback,
) {
  return watchRows<Message>(
    query(
      collection(needDb(), "teams", teamId, "messages"),
      orderBy("createdAt", "desc"),
      limit(100),
    ),
    (rows) => callback(rows.reverse()),
    onError,
  );
}
export function watchLeaderboard(
  category: Category,
  callback: (entries: LeaderboardEntry[]) => void,
  onError?: ErrorCallback,
) {
  return watchRows<LeaderboardEntry>(
    query(
      collection(needDb(), "leaderboards", category, "entries"),
      orderBy("score", "desc"),
      limit(50),
    ),
    callback,
    onError,
  );
}
