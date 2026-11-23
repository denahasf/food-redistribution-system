import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import { COLLECTIONS } from "../utils/constants";

export function watchStreetTags(callback, onError) {
  const q = query(
    collection(db, COLLECTIONS.streetPeople),
    where("isActive", "==", true),
    where("isResolved", "==", false),
    orderBy("taggedAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function createStreetTag(form, user, location) {
  await addDoc(collection(db, COLLECTIONS.streetPeople), {
    taggedById: user.uid,
    taggedByName: user.name,
    latitude: location.lat,
    longitude: location.lng,
    address: form.address || null,
    numberOfPeople: Number(form.numberOfPeople),
    conditions: form.conditions,
    notes: form.notes || "",
    imageUrl: null,
    taggedAt: serverTimestamp(),
    isResolved: false,
    isActive: true,
  });
  await setDoc(
    doc(db, COLLECTIONS.stats, "global"),
    { totalPeopleTagged: increment(Number(form.numberOfPeople)) },
    { merge: true }
  ).catch(() => {});
}

export async function resolveStreetTag(tag, user) {
  await updateDoc(doc(db, COLLECTIONS.streetPeople, tag.id), {
    isResolved: true,
    resolvedById: user.uid,
    resolvedAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, COLLECTIONS.stats, "global"),
    { totalPeopleHelped: increment(1) },
    { merge: true }
  ).catch(() => {});
}
