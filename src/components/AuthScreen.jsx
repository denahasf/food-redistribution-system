import { useState } from "react";
import { Eye, EyeOff, Lock, Mail, Phone, UserRound } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/images/hungelink_logo.png";

const roles = [
  ["donor", "Donor", "Hotel / Individual"],
  ["receiver", "Receiver", "Needy individual"],
  ["ngo", "NGO", "Organization"],
  ["volunteer", "Volunteer", "Helper"],
];

export default function AuthScreen() {
  const { login, signup, resetPassword, busy, error } = useAuth();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    role: "donor",
    organizationName: "",
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event) {
    event.preventDefault();
    setNotice("");
    if (mode === "login") {
      await login(form.email, form.password);
      return;
    }
    if (form.password !== form.confirm) {
      setNotice("Passwords do not match.");
      return;
    }
    await signup(form);
  }

  async function sendReset() {
    if (!form.email) {
      setNotice("Enter your email first.");
      return;
    }
    const ok = await resetPassword(form.email);
    setNotice(ok ? "Reset link sent. Check your email." : "");
  }

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <img src={logo} alt="HungeLink" className="brand-logo" />
        <h1>Rescue meals. Feed people.</h1>
        <p>A smarter way for donors, volunteers, and receivers to move surplus food while it is still fresh.</p>
      </section>

      <form className="auth-panel" onSubmit={submit}>
        <div className="panel-title">
          <p>{mode === "login" ? "Welcome back" : "Create account"}</p>
          <h2>{mode === "login" ? "Sign in to HungeLink" : "Join the food rescue network"}</h2>
        </div>

        {mode === "signup" && (
          <>
            <div className="role-grid">
              {roles.map(([value, label, subtitle]) => (
                <button
                  type="button"
                  key={value}
                  className={form.role === value ? "role-card selected" : "role-card"}
                  onClick={() => update("role", value)}
                >
                  <strong>{label}</strong>
                  <span>{subtitle}</span>
                </button>
              ))}
            </div>
            <label className="field">
              <UserRound size={18} />
              <input required placeholder="Full name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </label>
          </>
        )}

        <label className="field">
          <Mail size={18} />
          <input required type="email" placeholder="Email address" value={form.email} onChange={(e) => update("email", e.target.value)} />
        </label>

        {mode === "signup" && (
          <>
            <label className="field">
              <Phone size={18} />
              <input placeholder="Phone number" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
            </label>
            {form.role === "ngo" && (
              <label className="field">
                <UserRound size={18} />
                <input required placeholder="Organization name" value={form.organizationName} onChange={(e) => update("organizationName", e.target.value)} />
              </label>
            )}
          </>
        )}

        <label className="field">
          <Lock size={18} />
          <input
            required
            minLength={6}
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
          />
          <button type="button" className="icon-button" onClick={() => setShowPassword((value) => !value)}>
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </label>

        {mode === "signup" && (
          <label className="field">
            <Lock size={18} />
            <input required minLength={6} type="password" placeholder="Confirm password" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} />
          </label>
        )}

        {(error || notice) && <p className={error ? "message error" : "message"}>{error || notice}</p>}

        <button className="primary-button" disabled={busy}>{busy ? "Working..." : mode === "login" ? "Sign In" : "Create Account"}</button>

        {mode === "login" && <button type="button" className="text-button" onClick={sendReset}>Forgot password?</button>}

        <button type="button" className="switch-auth" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </form>
    </main>
  );
}
