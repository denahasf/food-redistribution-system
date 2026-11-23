import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "../services/firebase";
import { COLLECTIONS } from "../utils/constants";

const AuthContext = createContext(null);

function authMessage(error) {
  const code = error?.code || "";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("email-already-in-use")) return "Email already in use.";
  if (code.includes("weak-password")) return "Password is too weak.";
  if (code.includes("user-not-found") || code.includes("invalid-credential")) {
    return "Email or password is incorrect.";
  }
  if (code.includes("network-request-failed")) return "Network error. Check your connection.";
  return error?.message || "Authentication failed.";
}

async function loadUserModel(firebaseUser) {
  const ref = doc(db, COLLECTIONS.users, firebaseUser.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { uid: snap.id, ...snap.data() };

  const fallback = {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "User",
    email: firebaseUser.email || "",
    phone: firebaseUser.phoneNumber || "",
    role: "receiver",
    photoUrl: firebaseUser.photoURL || null,
    createdAt: serverTimestamp(),
    totalDonations: 0,
    totalReceived: 0,
    isVerified: false,
    isActive: true,
  };
  await setDoc(ref, fallback, { merge: true });
  return fallback;
}

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, async (current) => {
      setFirebaseUser(current);
      setError("");
      if (!current) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        setUser(await loadUserModel(current));
      } catch (err) {
        setError(authMessage(err));
        setUser({
          uid: current.uid,
          name: current.displayName || current.email?.split("@")[0] || "User",
          email: current.email || "",
          role: "receiver",
        });
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = useCallback(async (email, password) => {
    setBusy(true);
    setError("");
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      setUser(await loadUserModel(credential.user));
      return true;
    } catch (err) {
      setError(authMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const signup = useCallback(async ({ name, email, password, phone, role, organizationName }) => {
    setBusy(true);
    setError("");
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: name });
      const profile = {
        name,
        email: email.trim(),
        phone: phone || "",
        role,
        organizationName: role === "ngo" ? organizationName || "" : null,
        photoUrl: null,
        address: null,
        totalDonations: 0,
        totalReceived: 0,
        createdAt: serverTimestamp(),
        isVerified: false,
        isActive: true,
      };
      await setDoc(doc(db, COLLECTIONS.users, credential.user.uid), profile);
      setUser({ uid: credential.user.uid, ...profile });
      return true;
    } catch (err) {
      setError(authMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const resetPassword = useCallback(async (email) => {
    setBusy(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return true;
    } catch (err) {
      setError(authMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const logout = useCallback(() => signOut(auth), []);

  const value = useMemo(
    () => ({ firebaseUser, user, loading, busy, error, login, signup, resetPassword, logout }),
    [firebaseUser, user, loading, busy, error, login, signup, resetPassword, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
