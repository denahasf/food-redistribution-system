// functions/index.js
// Firebase Cloud Functions for the Food Redistribution app.
// Handles: auto-notifications, expiry cleanup, stats updates.
//
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 1: Notify all users when new food is listed
// ─────────────────────────────────────────────────────────────────────────────
exports.onNewFoodListing = functions.firestore
  .document('food_listings/{foodId}')
  .onCreate(async (snap, context) => {
    const food = snap.data();

    const message = {
      notification: {
        title: `🍱 New Food Available!`,
        body: `${food.foodName} (${food.quantity} ${food.unit}) by ${food.donorName}. Expires: ${_formatExpiry(food.expiryTime.toDate())}`,
      },
      data: {
        type: 'food_available',
        foodId: context.params.foodId,
        latitude: String(food.latitude),
        longitude: String(food.longitude),
      },
      topic: 'new_food', // All subscribed users receive this
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#2E7D32',
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      await messaging.send(message);
      console.log(`Notification sent for new food: ${food.foodName}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 2: Notify users when a street person is tagged nearby
// ─────────────────────────────────────────────────────────────────────────────
exports.onStreetPersonTagged = functions.firestore
  .document('street_people/{tagId}')
  .onCreate(async (snap, context) => {
    const tag = snap.data();

    const message = {
      notification: {
        title: `🙏 Street Person Needs Help`,
        body: `${tag.numberOfPeople} person(s) tagged near ${tag.address || 'a location'} by ${tag.taggedByName}. Conditions: ${tag.conditions.join(', ')}`,
      },
      data: {
        type: 'street_person',
        tagId: context.params.tagId,
        latitude: String(tag.latitude),
        longitude: String(tag.longitude),
      },
      topic: 'street_person',
      android: {
        notification: {
          icon: 'ic_notification',
          color: '#E91E63',
          sound: 'default',
          priority: 'high',
        },
      },
    };

    try {
      await messaging.send(message);
      console.log(`Street person notification sent for tag: ${context.params.tagId}`);
    } catch (error) {
      console.error('Error sending street person notification:', error);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 3: Notify donor when their food is claimed
// ─────────────────────────────────────────────────────────────────────────────
exports.onFoodClaimed = functions.firestore
  .document('food_listings/{foodId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only fire when status changes to 'claimed'
    if (before.status === after.status) return null;
    if (after.status !== 'claimed') return null;

    // Get donor's FCM token
    const donorDoc = await db.collection('users').doc(after.donorId).get();
    const donor = donorDoc.data();
    if (!donor || !donor.fcmToken) return null;

    const message = {
      notification: {
        title: `✅ Your food was claimed!`,
        body: `${after.foodName} was claimed by ${after.claimedByName}. They will pick it up soon.`,
      },
      data: {
        type: 'food_claimed',
        foodId: context.params.foodId,
      },
      token: donor.fcmToken, // Send only to the donor
    };

    try {
      await messaging.send(message);
      console.log(`Donor notified: ${after.donorName}`);
    } catch (error) {
      console.error('Error notifying donor:', error);
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// TRIGGER 4: Scheduled job — mark expired food, send expiry warnings
// Runs every hour via Cloud Scheduler
// ─────────────────────────────────────────────────────────────────────────────
exports.checkExpiredFood = functions.pubsub
  .schedule('every 60 minutes')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const twoHoursLater = new Date();
    twoHoursLater.setHours(twoHoursLater.getHours() + 2);
    const twoHoursLaterTs = admin.firestore.Timestamp.fromDate(twoHoursLater);

    const batch = db.batch();
    let expiredCount = 0;

    // 1. Mark as expired: listings where expiryTime has passed and still 'available'
    const expiredSnap = await db.collection('food_listings')
      .where('status', '==', 'available')
      .where('expiryTime', '<', now)
      .get();

    expiredSnap.forEach(doc => {
      batch.update(doc.ref, { status: 'expired' });
      expiredCount++;
    });

    await batch.commit();

    if (expiredCount > 0) {
      console.log(`Marked ${expiredCount} listings as expired.`);
    }

    // 2. Send expiry warning for listings expiring within 2 hours
    const soonExpiringSnap = await db.collection('food_listings')
      .where('status', '==', 'available')
      .where('expiryTime', '>', now)
      .where('expiryTime', '<', twoHoursLaterTs)
      .get();

    const warningPromises = [];
    soonExpiringSnap.forEach(doc => {
      const food = doc.data();
      warningPromises.push(
        messaging.send({
          notification: {
            title: `⏰ Food Expiring Soon!`,
            body: `${food.foodName} by ${food.donorName} expires within 2 hours. Claim it now!`,
          },
          data: { type: 'food_expiry', foodId: doc.id },
          topic: 'food_expiry',
        })
      );
    });

    await Promise.allSettled(warningPromises);
    console.log(`Sent ${warningPromises.length} expiry warnings.`);

    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Format expiry time to readable string
// ─────────────────────────────────────────────────────────────────────────────
function _formatExpiry(date) {
  const now = new Date();
  const diff = date - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (diff < 0) return 'Expired';
  if (hours === 0) return `${minutes}min`;
  return `${hours}h ${minutes}min`;
}
