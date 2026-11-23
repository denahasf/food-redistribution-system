import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  HandHeart,
  LayoutDashboard,
  ListFilter,
  LogOut,
  MapPinned,
  Plus,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { Geolocation } from "@capacitor/geolocation";
import AuthScreen from "./components/AuthScreen";
import FoodCard from "./components/FoodCard";
import MapView from "./components/MapView";
import { useAuth } from "./contexts/AuthContext";
import { db } from "./services/firebase";
import { claimFood, createFoodListing, watchAvailableFoods } from "./services/foodService";
import { createStreetTag, resolveStreetTag, watchStreetTags } from "./services/streetService";
import { COLLECTIONS, DEFAULT_CENTER, FOOD_CATEGORIES, STREET_CONDITIONS } from "./utils/constants";
import { distanceKm, toDate } from "./utils/format";
import logo from "./assets/images/hungelink_logo.png";

const tabs = [
  ["map", "Live Map", MapPinned],
  ["foods", "Foods", ListFilter],
  ["donate", "Donate", Plus],
  ["tags", "Tags", HandHeart],
  ["profile", "Profile", UserRound],
];

const emptyFoodForm = {
  foodName: "",
  category: FOOD_CATEGORIES[0],
  quantity: "",
  unit: "kg",
  servings: "",
  description: "",
  expiryTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString().slice(0, 16),
  isVegetarian: true,
  tags: [],
  address: "",
  image: null,
};

function useLocation() {
  const [location, setLocation] = useState({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] });
  const [status, setStatus] = useState("Using default Bangalore location.");

  useEffect(() => {
    let active = true;

    Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 })
      .then((pos) => {
        if (!active) return;
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("Current location active.");
      })
      .catch(() => {
        if (active) setStatus("Location permission not granted. You can still use pinned coordinates.");
      });

    return () => {
      active = false;
    };
  }, []);

  return { location, setLocation, status };
}

export default function App() {
  const { user, loading, logout } = useAuth();
  const [active, setActive] = useState("map");
  const [foods, setFoods] = useState([]);
  const [streetTags, setStreetTags] = useState([]);
  const [stats, setStats] = useState({});
  const [toast, setToast] = useState("");
  const [dataError, setDataError] = useState("");
  const locationState = useLocation();

  useEffect(() => {
    const offFoods = watchAvailableFoods(setFoods, (err) => setDataError(err.message));
    const offTags = watchStreetTags(setStreetTags, (err) => setDataError(err.message));
    const offStats = onSnapshot(doc(db, COLLECTIONS.stats, "global"), (snap) => setStats(snap.data() || {}));
    return () => {
      offFoods();
      offTags();
      offStats();
    };
  }, []);

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  if (loading) {
    return <div className="splash"><img src={logo} alt="" /><h1>HungeLink</h1></div>;
  }

  if (!user) return <AuthScreen />;

  const availableFoods = foods.filter((food) => toDate(food.expiryTime).getTime() > Date.now());

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActive("map")}>
          <img src={logo} alt="" />
          <span>HungeLink</span>
        </button>
        <nav>
          {tabs.map(([key, label, Icon]) => (
            <button key={key} className={active === key ? "nav-button active" : "nav-button"} onClick={() => setActive(key)}>
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
          {user.role === "admin" && (
            <button className={active === "admin" ? "nav-button active" : "nav-button"} onClick={() => setActive("admin")}>
              <LayoutDashboard size={20} />
              <span>Admin</span>
            </button>
          )}
        </nav>
        <button className="nav-button logout" onClick={logout}><LogOut size={20} /><span>Sign out</span></button>
      </aside>

      <main className="workspace">
        {toast && <div className="toast">{toast}</div>}
        {dataError && <div className="toast error">{dataError}</div>}
        {active === "map" && <Home foods={availableFoods} streetTags={streetTags} stats={stats} locationState={locationState} />}
        {active === "foods" && <Foods foods={availableFoods} user={user} location={locationState.location} notify={notify} />}
        {active === "donate" && <Donate user={user} locationState={locationState} notify={notify} />}
        {active === "tags" && <Tags user={user} streetTags={streetTags} locationState={locationState} notify={notify} />}
        {active === "profile" && <Profile user={user} stats={stats} />}
        {active === "admin" && <Admin stats={stats} foods={foods} streetTags={streetTags} />}
      </main>

      <nav className="bottom-nav">
        {tabs.map(([key, label, Icon]) => (
          <button key={key} className={active === key ? "active" : ""} onClick={() => setActive(key)}>
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function Home({ foods, streetTags, stats, locationState }) {
  const servings = foods.reduce((total, item) => total + Number(item.servings || 0), 0);
  const urgent = foods.filter((food) => toDate(food.expiryTime).getTime() - Date.now() < 2 * 60 * 60 * 1000).length;

  return (
    <section className="page-grid">
      <header className="page-header">
        <p>Live operations</p>
        <h1>Food rescue map</h1>
        <span>{locationState.status}</span>
      </header>
      <div className="metrics-row">
        <Metric label="Available listings" value={foods.length} />
        <Metric label="Open servings" value={servings} />
        <Metric label="Fast pickup" value={urgent} />
        <Metric label="People tagged" value={stats.totalPeopleTagged || 0} />
      </div>
      <div className="map-panel">
        <MapView foods={foods} streetTags={streetTags} center={[locationState.location.lat, locationState.location.lng]} />
      </div>
    </section>
  );
}

function Foods({ foods, user, location, notify }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const filtered = useMemo(() => {
    return foods
      .filter((food) => category === "All" || food.category === category)
      .filter((food) => {
        const text = `${food.foodName} ${food.category} ${food.description || ""} ${food.address || ""}`.toLowerCase();
        return text.includes(query.toLowerCase());
      })
      .sort((a, b) => distanceKm(location.lat, location.lng, a.latitude, a.longitude) - distanceKm(location.lat, location.lng, b.latitude, b.longitude));
  }, [foods, query, category, location]);

  async function handleClaim(food) {
    if (!window.confirm(`Claim ${food.foodName} from ${food.donorName}?`)) return;
    await claimFood(food, user);
    notify(`Food claimed. Contact ${food.donorPhone || "the donor"}.`);
  }

  return (
    <section className="page-grid">
      <PageHeader kicker="Food operations" title="Search and claim fresh donations" />
      <div className="toolbar">
        <label className="search"><Search size={18} /><input placeholder="Search food, location, category..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <button className="icon-command" onClick={() => window.location.reload()} title="Refresh"><RefreshCw size={18} /></button>
      </div>
      <div className="chip-row">
        {["All", ...FOOD_CATEGORIES].map((item) => <button key={item} className={category === item ? "chip active" : "chip"} onClick={() => setCategory(item)}>{item}</button>)}
      </div>
      <div className="food-list">
        {filtered.length ? filtered.map((food) => (
          <FoodCard key={food.id} food={food} onClaim={handleClaim} distance={distanceKm(location.lat, location.lng, food.latitude, food.longitude)} />
        )) : <Empty title="No food available" text="New donations will appear here as soon as donors post them." />}
      </div>
    </section>
  );
}

function Donate({ user, locationState, notify }) {
  const [form, setForm] = useState(emptyFoodForm);
  const [busy, setBusy] = useState(false);
  const quickTags = ["Hot", "Packed", "Homemade", "Restaurant", "Fresh", "Frozen"];

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleTag = (tag) => update("tags", form.tags.includes(tag) ? form.tags.filter((item) => item !== tag) : [...form.tags, tag]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await createFoodListing(form, user, locationState.location);
      setForm(emptyFoodForm);
      notify("Food posted successfully.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-page">
      <PageHeader kicker="Donate food" title="Post a fresh listing" />
      <form className="form-panel" onSubmit={submit}>
        <div className="form-grid">
          <Input label="Food name" required value={form.foodName} onChange={(value) => update("foodName", value)} />
          <Select label="Category" value={form.category} onChange={(value) => update("category", value)} options={FOOD_CATEGORIES} />
          <Input label="Quantity" required type="number" value={form.quantity} onChange={(value) => update("quantity", value)} />
          <Select label="Unit" value={form.unit} onChange={(value) => update("unit", value)} options={["kg", "plates", "boxes", "litres", "packets", "items"]} />
          <Input label="Servings" required type="number" value={form.servings} onChange={(value) => update("servings", value)} />
          <Input label="Expiry time" required type="datetime-local" value={form.expiryTime} onChange={(value) => update("expiryTime", value)} />
        </div>
        <label className="wide-label">Description<textarea value={form.description} onChange={(e) => update("description", e.target.value)} /></label>
        <label className="wide-label">Address / Landmark<input value={form.address} onChange={(e) => update("address", e.target.value)} /></label>
        <label className="wide-label">Food photo<input type="file" accept="image/*" onChange={(e) => update("image", e.target.files?.[0] || null)} /></label>
        <div className="switch-row"><span>Vegetarian</span><input type="checkbox" checked={form.isVegetarian} onChange={(e) => update("isVegetarian", e.target.checked)} /></div>
        <div className="chip-row">{quickTags.map((tag) => <button type="button" key={tag} className={form.tags.includes(tag) ? "chip active" : "chip"} onClick={() => toggleTag(tag)}>{tag}</button>)}</div>
        <p className="muted">Pickup coordinates: {locationState.location.lat.toFixed(5)}, {locationState.location.lng.toFixed(5)}</p>
        <button className="primary-button" disabled={busy}>{busy ? "Posting..." : "Post Food Donation"}</button>
      </form>
    </section>
  );
}

function Tags({ user, streetTags, locationState, notify }) {
  const [form, setForm] = useState({ numberOfPeople: 1, conditions: ["Needs Food"], notes: "", address: "" });
  const [busy, setBusy] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleCondition = (condition) => update("conditions", form.conditions.includes(condition) ? form.conditions.filter((item) => item !== condition) : [...form.conditions, condition]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await createStreetTag(form, user, locationState.location);
      notify("Street help tag posted.");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(tag) {
    await resolveStreetTag(tag, user);
    notify("Tag marked resolved.");
  }

  return (
    <section className="split-page">
      <div>
        <PageHeader kicker="Street tagging" title="Mark where help is needed" />
        <form className="form-panel" onSubmit={submit}>
          <Input label="Number of people" type="number" value={form.numberOfPeople} onChange={(value) => update("numberOfPeople", value)} />
          <label className="wide-label">Address / Landmark<input value={form.address} onChange={(e) => update("address", e.target.value)} /></label>
          <label className="wide-label">Notes<textarea value={form.notes} onChange={(e) => update("notes", e.target.value)} /></label>
          <div className="chip-row">{STREET_CONDITIONS.map((condition) => <button type="button" className={form.conditions.includes(condition) ? "chip active" : "chip"} key={condition} onClick={() => toggleCondition(condition)}>{condition}</button>)}</div>
          <p className="muted">Tag coordinates: {locationState.location.lat.toFixed(5)}, {locationState.location.lng.toFixed(5)}</p>
          <button className="primary-button" disabled={busy}>{busy ? "Posting..." : "Post Help Tag"}</button>
        </form>
      </div>
      <div className="stack-list">
        {streetTags.map((tag) => (
          <article className="mini-card" key={tag.id}>
            <strong>{tag.numberOfPeople} people</strong>
            <span>{tag.address || "Pinned location"}</span>
            <p>{(tag.conditions || []).join(", ")}</p>
            <button className="secondary-button" onClick={() => resolve(tag)}>Mark resolved</button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Profile({ user, stats }) {
  return (
    <section className="page-grid">
      <PageHeader kicker="Profile" title={user.name || "HungeLink user"} />
      <div className="profile-card">
        <div className="avatar">{(user.name || "U").slice(0, 1).toUpperCase()}</div>
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
          <span className="badge">{user.role}</span>
        </div>
      </div>
      <div className="metrics-row">
        <Metric label="Your donations" value={user.totalDonations || 0} />
        <Metric label="Your claims" value={user.totalReceived || 0} />
        <Metric label="Total servings" value={stats.totalServings || 0} />
        <Metric label="People helped" value={stats.totalPeopleHelped || 0} />
      </div>
    </section>
  );
}

function Admin({ stats, foods, streetTags }) {
  return (
    <section className="page-grid">
      <PageHeader kicker="Admin" title="Network dashboard" />
      <div className="metrics-row">
        <Metric label="Donations" value={stats.totalDonations || foods.length} />
        <Metric label="Claimed" value={stats.totalFoodClaimed || 0} />
        <Metric label="Servings" value={stats.totalServings || 0} />
        <Metric label="Tagged" value={stats.totalPeopleTagged || streetTags.length} />
      </div>
      <div className="admin-panel">
        <BarChart3 />
        <p>Recent active listings: {foods.length}</p>
        <p>Open street help tags: {streetTags.length}</p>
      </div>
    </section>
  );
}

function PageHeader({ kicker, title }) {
  return <header className="page-header"><p>{kicker}</p><h1>{title}</h1></header>;
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function Empty({ title, text }) {
  return <div className="empty"><Bell size={28} /><h3>{title}</h3><p>{text}</p></div>;
}

function Input({ label, value, onChange, ...props }) {
  return <label className="wide-label">{label}<input {...props} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="wide-label">{label}<select value={value} onChange={(e) => onChange(e.target.value)}>{options.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>;
}
