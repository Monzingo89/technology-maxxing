import { auth, callAction } from "./firebase";

export interface GuestAllowance {
  completed: number;
  remaining: number;
  receipt: string;
}
const RECEIPTS_KEY = "iot:guest-receipts:v1";
const ATTEMPT_KEY = "iot:guest-attempt:v1";
let pending: Promise<unknown> = Promise.resolve();
let memoryReceipts: string[] = [];
let memoryAttempt = "";

function receipts(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(RECEIPTS_KEY) || "[]");
    if (Array.isArray(saved))
      memoryReceipts = [
        ...new Set([
          ...memoryReceipts,
          ...saved.filter((item) => typeof item === "string"),
        ]),
      ];
  } catch {
    /* The current session still works when browser storage is disabled. */
  }
  return memoryReceipts;
}
function remember(receipt: string) {
  memoryReceipts = [...new Set([...receipts(), receipt])];
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(memoryReceipts));
  } catch {
    /* Nonessential for same-IP cleanup. */
  }
}
function queued<T>(action: () => Promise<T>): Promise<T> {
  const result = pending.then(action, action);
  pending = result.catch(() => undefined);
  return result;
}
function guestCall(name: string, data = {}): Promise<GuestAllowance> {
  return queued(async () => {
    if (auth?.currentUser)
      throw new Error("Your account is signed in. Please try again.");
    const status = await callAction<GuestAllowance>(name, data);
    remember(status.receipt);
    return status;
  });
}
export const getGuestAllowance = () => guestCall("getGuestAllowance");
export async function startGuestAssessment(): Promise<
  GuestAllowance & { attemptId: string }
> {
  try {
    memoryAttempt = sessionStorage.getItem(ATTEMPT_KEY) || memoryAttempt;
  } catch {
    /* Keep in memory. */
  }
  const attemptId = memoryAttempt || crypto.randomUUID();
  memoryAttempt = attemptId;
  try {
    sessionStorage.setItem(ATTEMPT_KEY, attemptId);
  } catch {
    /* Keep in memory. */
  }
  try {
    const status = await guestCall("startGuestAssessment", { attemptId });
    return { ...status, attemptId };
  } catch (error) {
    if ((error as { code?: string }).code !== "functions/already-exists")
      throw error;
    // A completed request may have succeeded before the previous tab reloaded.
    memoryAttempt = "";
    try {
      sessionStorage.removeItem(ATTEMPT_KEY);
    } catch {
      /* Keep in memory. */
    }
    return startGuestAssessment();
  }
}
export async function completeGuestAssessment(
  attemptId: string,
  receipt: string,
) {
  const status = await guestCall("completeGuestAssessment", {
    attemptId,
    receipt,
  });
  memoryAttempt = "";
  try {
    sessionStorage.removeItem(ATTEMPT_KEY);
  } catch {
    /* Keep in memory. */
  }
  return status;
}
export function clearGuestAllowance() {
  // Finish already-started guest requests before deletion so they cannot recreate
  // the record after account creation. Retain receipts until all deletes succeed.
  return queued(async () => {
    const saved = receipts();
    for (const receipt of saved.length ? saved : [undefined])
      await callAction("clearGuestAllowance", receipt ? { receipt } : {});
    memoryReceipts = [];
    memoryAttempt = "";
    try {
      localStorage.removeItem(RECEIPTS_KEY);
      sessionStorage.removeItem(ATTEMPT_KEY);
    } catch {
      /* The server deletion still succeeded. */
    }
  });
}
