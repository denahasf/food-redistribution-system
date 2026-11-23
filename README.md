# 🍱 Food Redistribution & Donation System
### *Share Food. Save Lives. Reduce Waste.*

A complete Flutter + Firebase mobile app connecting **food donors** (hotels, individuals) with **receivers** (NGOs, volunteers, needy people) using **OpenStreetMap** — no paid API keys required.

---

## 📱 App Screenshots Overview

| Splash | Login | Map Home | Food List |
|--------|-------|----------|-----------|
| Animated green splash | Email/Phone auth | OSM + food/person markers | Searchable, filterable |

| Add Food | Street Tag | Admin Dashboard | Notifications |
|----------|-----------|-----------------|---------------|
| Full form + GPS | Map tap + conditions | Charts + stats | Real-time FCM |

---

## 🏗️ Project Structure

```
food_redistribution/
├── lib/
│   ├── main.dart                    # App entry + Provider setup
│   ├── firebase_options.dart        # Firebase config (auto-generated)
│   ├── models/
│   │   ├── user_model.dart          # User data model
│   │   ├── food_model.dart          # Food listing model
│   │   └── street_person_model.dart # Street person + notification models
│   ├── providers/
│   │   ├── auth_provider.dart       # Firebase Auth state
│   │   ├── food_provider.dart       # Food CRUD + Firestore streams
│   │   ├── location_provider.dart   # GPS via geolocator
│   │   ├── street_people_provider.dart # Street tagging
│   │   ├── notification_provider.dart  # FCM + local notifications
│   │   └── admin_provider.dart      # Dashboard statistics
│   ├── screens/
│   │   ├── splash_screen.dart       # Animated launch screen
│   │   ├── auth/
│   │   │   ├── login_screen.dart    # Email/password login
│   │   │   ├── signup_screen.dart   # Registration + role selection
│   │   │   └── phone_auth_screen.dart # OTP verification
│   │   ├── shared/
│   │   │   ├── main_navigation_screen.dart # Bottom nav root
│   │   │   ├── home_map_screen.dart        # OSM map + markers
│   │   │   ├── street_tagging_screen.dart  # Tag & list street people
│   │   │   └── profile_screen.dart         # User profile + stats
│   │   ├── donor/
│   │   │   └── add_food_screen.dart # Add food listing form
│   │   ├── receiver/
│   │   │   └── food_list_screen.dart # Browse & claim food
│   │   └── admin/
│   │       └── admin_dashboard_screen.dart # Stats + charts
│   ├── widgets/
│   │   ├── custom_text_field.dart    # Reusable form field
│   │   ├── loading_button.dart       # Button with loading state
│   │   ├── food_card.dart            # Food listing card
│   │   ├── food_detail_bottom_sheet.dart    # Map tap detail
│   │   ├── street_person_detail_sheet.dart  # Street tag detail
│   │   ├── empty_state_widget.dart   # Empty list placeholder
│   │   └── section_header.dart       # Form section label
│   └── utils/
│       ├── app_theme.dart            # Colors, typography, theme
│       ├── app_constants.dart        # All string constants
│       └── helpers.dart              # Utility functions
├── android/
│   ├── app/
│   │   ├── build.gradle              # Firebase + minSdk 23
│   │   └── src/main/AndroidManifest.xml # Permissions
│   └── build.gradle                  # Google services classpath
└── pubspec.yaml                      # All dependencies
```

---

## 🚀 Step-by-Step Setup

### Step 1: Prerequisites

```bash
# Check Flutter installation
flutter doctor

# Required versions
# Flutter: 3.16+
# Dart: 3.0+
# Android Studio / Xcode installed
```

### Step 2: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"** → Name: `food-redistribution`
3. Disable Google Analytics (optional) → **Create project**

### Step 3: Enable Firebase Services

In Firebase Console, enable these services:

#### 3a. Authentication
```
Firebase Console → Authentication → Get Started
Enable:
  ✅ Email/Password
  ✅ Phone
```

#### 3b. Firestore Database
```
Firebase Console → Firestore Database → Create database
Choose: Start in TEST mode (for development)
Location: Select closest to your region
```

#### 3c. Firebase Storage
```
Firebase Console → Storage → Get Started
Choose: Start in TEST mode
```

#### 3d. Firebase Cloud Messaging (FCM)
```
Firebase Console → Project Settings → Cloud Messaging
Note down your Server Key (for backend notifications)
```

### Step 4: Connect Flutter App to Firebase

```bash
# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Add to PATH if needed (Mac/Linux)
export PATH="$PATH":"$HOME/.pub-cache/bin"

# In your project root:
cd food_redistribution
flutterfire configure

# Select your Firebase project: food-redistribution
# Select platforms: android, ios (as needed)
# This auto-generates lib/firebase_options.dart ✅
```

### Step 5: Add Platform Config Files

#### Android
Download `google-services.json` from:
```
Firebase Console → Project Settings → Your apps → Android app
→ Download google-services.json
```
Place at: `android/app/google-services.json`

#### iOS
Download `GoogleService-Info.plist` from:
```
Firebase Console → Project Settings → Your apps → iOS app
→ Download GoogleService-Info.plist
```
Place at: `ios/Runner/GoogleService-Info.plist`

### Step 6: Install Dependencies

```bash
flutter pub get
```

### Step 7: Run the App

```bash
# Android
flutter run

# iOS
flutter run -d <ios-device-id>

# Release build (Android APK)
flutter build apk --release

# App Bundle (Play Store)
flutter build appbundle --release
```

---

## 🗺️ Map Integration (OpenStreetMap — FREE)

The app uses **flutter_map** with OpenStreetMap tiles.

**No API key needed!** The tile URL is:
```
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

### Map Features:
- **Green markers 🍱** = Available food (color changes by expiry urgency)
- **Pink markers 🙏** = Tagged street people needing help
- **Blue dot** = Your current location
- **Tap any marker** → Bottom sheet with full details
- **Filter chips** → Toggle food/people markers on/off
- **Legend** → Color coding explanation

---

## 🔥 Firestore Data Structure

```
firestore/
├── users/{uid}
│   ├── name, email, phone, role
│   ├── latitude, longitude
│   ├── totalDonations, totalReceived
│   └── fcmToken, createdAt
│
├── food_listings/{id}
│   ├── donorId, donorName, donorPhone
│   ├── foodName, category, quantity, unit
│   ├── description, imageUrl
│   ├── latitude, longitude, address
│   ├── expiryTime, createdAt
│   ├── status: available|claimed|expired|delivered
│   ├── claimedById, claimedByName, claimedAt
│   ├── servings, isVegetarian, tags[]
│   └── ...
│
├── street_people/{id}
│   ├── taggedById, taggedByName
│   ├── latitude, longitude
│   ├── numberOfPeople, conditions[]
│   ├── notes, imageUrl
│   ├── isResolved, resolvedById
│   └── taggedAt, isActive
│
├── notifications/{id}
│   ├── userId, title, body, type
│   ├── referenceId, isRead
│   └── createdAt
│
└── app_stats/global
    ├── totalDonations
    ├── totalPeopleHelped
    ├── totalPeopleTagged
    ├── totalServings
    └── totalDelivered
```

### Firestore Security Rules (Production):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: read own profile, write own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // Food listings: anyone logged in can read, only donor can update/delete
    match /food_listings/{foodId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        (resource.data.donorId == request.auth.uid ||
         request.resource.data.keys().hasOnly(['status', 'claimedById', 'claimedByName', 'claimedAt']));
      allow delete: if request.auth.uid == resource.data.donorId;
    }

    // Street people: anyone logged in can read/create, only tagger can delete
    match /street_people/{tagId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth.uid == resource.data.taggedById;
    }

    // Notifications: only the target user can read their own
    match /notifications/{notifId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth != null;
    }

    // Stats: readable by all, writable only via Cloud Functions
    match /app_stats/{doc} {
      allow read: if request.auth != null;
      allow write: if false; // Write via Cloud Functions only
    }
  }
}
```

---

## 📲 Firebase Cloud Messaging (FCM) Setup

### Android FCM
FCM works out of the box with `google-services.json` in place.

### iOS FCM
Additional steps required:
1. In Xcode → Signing & Capabilities → add **Push Notifications**
2. Upload APNs key in Firebase Console:
   ```
   Project Settings → Cloud Messaging → iOS app config
   → Upload APNs Auth Key (.p8 file from Apple Developer)
   ```

### Send Notifications (Server-Side Example)
```bash
# Using FCM v1 API
curl -X POST \
  https://fcm.googleapis.com/v1/projects/food-redistribution/messages:send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "topic": "new_food",
      "notification": {
        "title": "🍱 New Food Available!",
        "body": "Biryani available 2km from you. Expires in 3 hours!"
      },
      "data": {
        "type": "food_available",
        "foodId": "xyz123"
      }
    }
  }'
```

---

## 🔐 User Roles & Permissions

| Role | Donate | Claim | Tag Street | Admin |
|------|--------|-------|-----------|-------|
| **Donor** | ✅ | ✅ | ✅ | ❌ |
| **Receiver** | ✅ | ✅ | ✅ | ❌ |
| **NGO** | ✅ | ✅ | ✅ | ❌ |
| **Volunteer** | ✅ | ✅ | ✅ | ❌ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |

---

## 📦 Key Dependencies Explained

| Package | Purpose |
|---------|---------|
| `flutter_map` | OpenStreetMap integration (FREE, no API key) |
| `latlong2` | Lat/Long coordinate handling |
| `geolocator` | Device GPS access |
| `firebase_auth` | Email + Phone OTP auth |
| `cloud_firestore` | Real-time NoSQL database |
| `firebase_messaging` | Push notifications (FCM) |
| `firebase_storage` | Image upload/storage |
| `provider` | State management |
| `image_picker` | Camera/gallery photo picker |
| `cached_network_image` | Efficient image loading with cache |
| `fl_chart` | Admin dashboard charts |
| `url_launcher` | Call donor via phone link |

---

## 🛠️ Troubleshooting

### "Google Services plugin not found"
Ensure `google-services.json` is in `android/app/` and `build.gradle` has:
```gradle
classpath 'com.google.gms:google-services:4.4.0'
```

### "Location permission denied"
Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
```
And handle runtime permission in app (already done via `permission_handler`).

### "Map not showing"
Check internet permission in `AndroidManifest.xml`. OSM tiles require internet access.

### "Phone OTP not working"
- Ensure phone number has country code: `+91XXXXXXXXXX`
- Enable Phone auth in Firebase Console
- For testing: add test phone numbers in Firebase Auth Console

### Build fails on minSdkVersion
Ensure `android/app/build.gradle` has `minSdkVersion 23` (Firebase minimum).

---

## 🌱 Future Enhancements

- [ ] **AI Food Detection** – Camera auto-detects food type
- [ ] **Route Navigation** – Volunteer routing to multiple pickups
- [ ] **Food Waste Analytics** – Monthly environmental impact reports
- [ ] **Multi-language Support** – Hindi, Tamil, Telugu, etc.
- [ ] **Blockchain Transparency** – Tamper-proof donation records
- [ ] **QR Code Verification** – Donor/receiver handoff confirmation
- [ ] **Ratings & Reviews** – Build trust in the community
- [ ] **Cloud Functions** – Auto-expire listings + FCM triggers

---

## 📄 License
MIT License — Free to use, modify, and distribute.

---

*Built with ❤️ to reduce food waste and feed the hungry.*
