import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { COLLECTIONS } from "../utils/constants";

export function watchAvailableFoods(callback, onError) {
  const q = query(
    collection(db, COLLECTIONS.foods),
    where("status", "==", "available"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((item) => ({ id: item.id, ...item.data() }))),
    onError
  );
}

export async function createFoodListing(form, user, location) {
  let imageUrl = null;
  if (form.image) {
    const imageRef = ref(storage, `food_images/${user.uid}/${Date.now()}-${form.image.name}`);
    await uploadBytes(imageRef, form.image);
    imageUrl = await getDownloadURL(imageRef);
  }

  const payload = {
    donorId: user.uid,
    donorName: user.name,
    donorPhone: user.phone || "",
    foodName: form.foodName,
    category: form.category,
    quantity: Number(form.quantity),
    unit: form.unit,
    description: form.description || "",
    imageUrl,
    latitude: location.lat,
    longitude: location.lng,
    address: form.address || null,
    expiryTime: Timestamp.fromDate(new Date(form.expiryTime)),
    createdAt: serverTimestamp(),
    status: "available",
    tags: form.tags,
    isVegetarian: form.isVegetarian,
    servings: Number(form.servings),
  };

  await addDoc(collection(db, COLLECTIONS.foods), payload);
  await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
    totalDonations: increment(1),
  }).catch(() => {});
  await setDoc(
    doc(db, COLLECTIONS.stats, "global"),
    { totalDonations: increment(1), totalServings: increment(Number(form.servings)) },
    { merge: true }
  ).catch(() => {});
}

export async function claimFood(food, user) {
  await updateDoc(doc(db, COLLECTIONS.foods, food.id), {
    status: "claimed",
    claimedById: user.uid,
    claimedByName: user.name,
    claimedAt: serverTimestamp(),
  });
  await updateDoc(doc(db, COLLECTIONS.users, user.uid), {
    totalReceived: increment(1),
  }).catch(() => {});
  await setDoc(
    doc(db, COLLECTIONS.stats, "global"),
    { totalFoodClaimed: increment(1) },
    { merge: true }
  ).catch(() => {});
}

export async function deleteFoodListing(id) {
  await deleteDoc(doc(db, COLLECTIONS.foods, id));
}
