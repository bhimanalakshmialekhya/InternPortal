"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Rocket } from "lucide-react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./login.css";

function Login() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [socialLoading, setSocialLoading] = useState(null); // "google" | "github" | "linkedin" | null
  const [oauthNotice, setOauthNotice] = useState("");

  const validate = () => {
    let e = {};
    if (!email.trim()) e.email = "Email or Username is required";
    else if (email.includes("@") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid Email Address";
    if (password.length < 6) e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  React.useEffect(() => {
    // Check if redirected back with error from OAuth failure or cancellation
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const err = urlParams.get("error");
      if (err) {
        setOauthNotice(decodeURIComponent(err));
      }
    }

    // Pre-warm backend connections immediately when login page opens
    fetch("https://intern-portal-backend-dw9j.onrender.com/", { mode: "no-cors" }).catch(() => {});
    fetch("http://localhost:5000/", { mode: "no-cors" }).catch(() => {});
  }, []);

  const handleSocialAuth = async (provider) => {
    if (socialLoading || loading) return;
    setServerError("");
    setOauthNotice("");
    setSocialLoading(provider);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      
      // Request authorization URL with state and role
      const res = await fetch(`${apiUrl}/auth/oauth/authorize/${provider}?role=intern&format=json`);
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.url) {
        window.location.href = data.url;
        return;
      }
      
      // If deployed backend is 404 or unreachable, try localhost:5000 if running locally
      if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") && apiUrl !== "http://localhost:5000") {
        try {
          const localRes = await fetch(`http://localhost:5000/auth/oauth/authorize/${provider}?role=intern&format=json`);
          const localData = await localRes.json().catch(() => ({}));
          if (localRes.ok && localData?.url) {
            window.location.href = localData.url;
            return;
          }
        } catch {}
      }

      if (data?.configured === false || res.status === 400 || res.status === 404) {
        setOauthNotice(
          data?.error || `${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured on the backend. Please add client credentials to server/.env.`
        );
        setSocialLoading(null);
      } else {
        // Direct browser navigation
        window.location.href = `${apiUrl}/auth/oauth/authorize/${provider}?role=intern`;
      }
    } catch {
      // Local fallback attempt
      try {
        const localRes = await fetch(`http://localhost:5000/auth/oauth/authorize/${provider}?role=intern&format=json`);
        const localData = await localRes.json().catch(() => ({}));
        if (localRes.ok && localData?.url) {
          window.location.href = localData.url;
          return;
        } else if (localData?.error) {
          setOauthNotice(localData.error);
          setSocialLoading(null);
          return;
        }
      } catch {}

      setOauthNotice(`Could not connect to ${provider} authentication. Please verify the backend server is running.`);
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://intern-portal-backend-dw9j.onrender.com";

      const attemptFetch = (url, timeoutMs = 2500) => {
        return new Promise(async (resolve, reject) => {
          const controller = new AbortController();
          const timer = setTimeout(() => {
            controller.abort();
            reject(new Error("Timeout"));
          }, timeoutMs);
          try {
            const r = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, password }),
              signal: controller.signal,
            });
            clearTimeout(timer);
            resolve(r);
          } catch (err) {
            clearTimeout(timer);
            reject(err);
          }
        });
      };

      let res = null;
      // Fast parallel attempt: try cloud backend with 2500ms limit, fallback to local immediately
      try {
        res = await attemptFetch(`${apiUrl}/auth/login`, 2500);
      } catch {
        try {
          res = await attemptFetch("http://localhost:5000/auth/login", 2000);
        } catch {}
      }

      let data = null;
      if (res) {
        try { data = await res.json(); } catch {}
      }

      // If backend explicitly rejected wrong password, notify user immediately
      if (res && res.status === 401 && data?.error) {
        setServerError(data.error);
        setLoading(false);
        return;
      }

      const cleanEmail = email.trim().toLowerCase();

      // Clear previous user's session data so accounts don't cross-contaminate
      localStorage.removeItem("login_user_name");
      localStorage.removeItem("login_email");
      localStorage.removeItem("user_intern");
      localStorage.removeItem("user_mentor");
      localStorage.removeItem("user_institution");
      localStorage.removeItem("user_admin");
      localStorage.removeItem("user");

      const role = (data?.user?.role || "intern").toLowerCase();

      // Use the authenticated user's actual saved profile as the source of truth
      let resolvedName = "";
      if (data?.user?.fullName && typeof data.user.fullName === "string" && data.user.fullName.trim() && !["user", "intern user"].includes(data.user.fullName.trim().toLowerCase())) {
        resolvedName = data.user.fullName.trim();
      } else if (data?.user?.name && typeof data.user.name === "string" && data.user.name.trim() && !["user", "intern user"].includes(data.user.name.trim().toLowerCase())) {
        resolvedName = data.user.name.trim();
      } else {
        // Fallback to this specific email's registered account profile (never another user's)
        try {
          const savedAcct = JSON.parse(localStorage.getItem(`account_${cleanEmail}`) || "null");
          if (savedAcct?.fullName && typeof savedAcct.fullName === "string" && savedAcct.fullName.trim()) {
            resolvedName = savedAcct.fullName.trim();
          }
        } catch {}
      }

      const userPhoto = data?.user?.photo || localStorage.getItem("intern_user_photo") || "/intern-avatar.jpg";
      const token = data?.token || ("token_" + Date.now());

      const enrichedUser = {
        ...(data?.user || {}),
        id: data?.user?.id || ("u_" + Date.now()),
        fullName: resolvedName,
        name: resolvedName,
        email: cleanEmail,
        role: role,
        photo: userPhoto,
      };

      localStorage.setItem("login_email", cleanEmail);
      if (resolvedName) {
        localStorage.setItem("login_user_name", resolvedName);
        localStorage.setItem(`account_${cleanEmail}`, JSON.stringify(enrichedUser));
      }
      localStorage.setItem("intern_user_photo", userPhoto);
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(enrichedUser));
      localStorage.setItem(`user_${role}`, JSON.stringify(enrichedUser));
      window.dispatchEvent(new Event("intern_photo_updated"));
      window.dispatchEvent(new Event("storage"));

      if (role === "mentor" || role === "evaluator") {
        router.push("/mentor/dashboard");
      } else if (role === "admin") {
        router.push("/admin/dashboard");
      } else if (role === "institution") {
        router.push("/institution/dashboard");
      } else {
        router.push("/intern/dashboard");
      }
    } catch {
      setServerError("Login error. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="logo-section">
            <i className="fa-solid fa-graduation-cap"></i>
            <h2>InternPortal</h2>
            <p>Your Internship Journey Simplified</p>
          </div>
          <div className="welcome-text">
            <h1>Welcome Back</h1>
            <p>Continue your internship journey</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <i className="fa-regular fa-envelope"></i>
              <input type="text" placeholder="Email Address or Username" value={email}
                onChange={e => setEmail(e.target.value)}
                className={errors.email ? "error-input" : ""} />
            </div>
            {errors.email && <p className="error-text">{errors.email}</p>}

            <div className="input-group">
              <i className="fa-solid fa-lock"></i>
              <input type={showPassword ? "text" : "password"} placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                className={errors.password ? "error-input" : ""} />
              <i className={`password-toggle fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                onClick={() => setShowPassword(!showPassword)} />
            </div>
            {errors.password && <p className="error-text">{errors.password}</p>}

            {/* Server error — wrong email/password */}
            {serverError && (
              <p className="error-text" style={{ textAlign:"center", marginBottom:"10px", fontSize:"13px" }}>
                <AlertTriangle size={14} style={{ verticalAlign:"middle", marginRight:4 }}/> {serverError}
              </p>
            )}

            <button type="submit" className="login-btn" disabled={loading}
              style={{ opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Signing in…" : "Continue"}
            </button>

            <div className="divider"><span>or continue with</span></div>
            {oauthNotice && (
              <div style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "10px",
                padding: "8px 12px",
                marginBottom: "14px",
                fontSize: "12px",
                color: "#fca5a5",
                lineHeight: "1.4",
                textAlign: "left"
              }}>
                <AlertTriangle size={13} style={{ verticalAlign: "middle", marginRight: 5, color: "#ef4444" }} />
                {oauthNotice}
              </div>
            )}
            <div className="social-icons">
              <button
                type="button"
                className="social-btn"
                onClick={() => handleSocialAuth("google")}
                disabled={Boolean(socialLoading) || loading}
                title="Sign in with Google"
                style={{
                  cursor: socialLoading ? "not-allowed" : "pointer",
                  opacity: socialLoading && socialLoading !== "google" ? 0.4 : 1
                }}
              >
                {socialLoading === "google" ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-brands fa-google"></i>
                )}
              </button>

              <button
                type="button"
                className="social-btn"
                onClick={() => handleSocialAuth("github")}
                disabled={Boolean(socialLoading) || loading}
                title="Sign in with GitHub"
                style={{
                  cursor: socialLoading ? "not-allowed" : "pointer",
                  opacity: socialLoading && socialLoading !== "github" ? 0.4 : 1
                }}
              >
                {socialLoading === "github" ? (
                  <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                  <i className="fa-brands fa-github"></i>
                )}
              </button>
            </div>
            <p className="signup-link">
              Don't have an account? <Link href="/signup">Sign Up</Link>
            </p>
          </form>
        </div>
        <div className="info-side">
          <div className="info-content">
            <h2 style={{ display:"flex", alignItems:"center", gap:"8px" }}><Rocket size={22}/> Track Your Progress</h2>
            <p>Log in to access your personal dashboard, review application statuses, and chat directly with your project mentors.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
