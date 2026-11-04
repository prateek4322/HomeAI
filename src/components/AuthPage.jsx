import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";

import {
  Home,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Package,
  CalendarClock,
  Leaf,
  CheckCircle2,
  ScanLine,
  TrendingUp,
} from "lucide-react";

export default function AuthPage() {
  const { login, signup, googleLogin } = useAuth();
  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  const resetToken = new URLSearchParams(window.location.search).get("token");
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(Boolean(resetToken));
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isResetPassword) {
        if (!resetToken) {
          throw new Error("Reset link is invalid. Please request a new password reset link.");
        }
        if (form.password.length < 8) {
          throw new Error("Password must contain at least 8 characters.");
        }
        if (form.password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }

        const response = await fetch(`${API_BASE}/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: resetToken,
            password: form.password,
          }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Password reset failed.");

        setSuccess(data.message || "Password reset successfully. Please sign in.");
        setIsResetPassword(false);
        setIsForgotPassword(false);
        setIsLogin(true);
        setForm({ name: "", email: "", password: "" });
        setConfirmPassword("");
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (isForgotPassword) {
        const response = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to send reset link.");
        setSuccess(data.message || "If an account exists for this email, a password reset link has been sent.");
      } else if (isLogin) {
        await login({
          email: form.email,
          password: form.password,
        });
      } else {
        await signup(form);
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (response) => {
    setError("");
    setGoogleLoading(true);

    try {
      await googleLogin(response.credential);
    } catch (err) {
      setError(err.message || "Google authentication failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setIsForgotPassword(false);
    setError("");
    setSuccess("");
    setForm({ name: "", email: "", password: "" });
  };

  return (
    <div className="auth-page">
      <div className="auth-background-glow auth-glow-one" />
      <div className="auth-background-glow auth-glow-two" />

      <div className="auth-layout">

        {/* LEFT BRANDING SECTION */}
        <section className="auth-visual">

          <div className="visual-brand">
            <div className="visual-logo">
              <Home size={27} strokeWidth={2.2} />
            </div>

            <div>
              <h1>Home<span>AI</span></h1>
              <p>Smart Home, Zero Waste</p>
            </div>
          </div>

          <div className="visual-content">
            <div className="visual-tag">
              <Sparkles size={15} />
              SMARTER LIVING STARTS HERE
            </div>

            <h2>
              Your home.
              <br />
              <span>Under control.</span>
            </h2>

            <p className="visual-description">
              A smarter way to manage your household.
              Track products, monitor expiry dates and
              reduce everyday waste with AI.
            </p>

            {/* INVENTORY PREVIEW */}
            <div className="inventory-preview">

              <div className="preview-header">
                <div>
                  <span className="preview-eyebrow">
                    YOUR HOME OVERVIEW
                  </span>
                  <h3>Inventory snapshot</h3>
                </div>

                <div className="preview-icon">
                  <ScanLine size={20} />
                </div>
              </div>

              <div className="preview-stats">

                <div className="preview-stat">
                  <div className="stat-icon green">
                    <Package size={18} />
                  </div>
                  <div>
                    <strong>128</strong>
                    <span>Total items</span>
                  </div>
                </div>

                <div className="preview-stat">
                  <div className="stat-icon yellow">
                    <CalendarClock size={18} />
                  </div>
                  <div>
                    <strong>08</strong>
                    <span>Expiring soon</span>
                  </div>
                </div>

              </div>

              <div className="preview-divider" />

              <div className="preview-product-heading">
                <span>RECENTLY TRACKED</span>
                <span>Live preview</span>
              </div>

              <div className="preview-product">
                <div className="product-emoji">🥛</div>
                <div className="product-info">
                  <strong>Fresh Milk</strong>
                  <span>Kitchen · 1 Litre</span>
                </div>
                <div className="product-status warning">
                  2 days left
                </div>
              </div>

              <div className="preview-product">
                <div className="product-emoji">🥦</div>
                <div className="product-info">
                  <strong>Fresh Vegetables</strong>
                  <span>Refrigerator · 500 g</span>
                </div>
                <div className="product-status safe">
                  <CheckCircle2 size={13} />
                  Fresh
                </div>
              </div>

              <div className="preview-bottom">
                <div className="preview-bottom-icon">
                  <TrendingUp size={17} />
                </div>
                <span>Make every item count. Waste less.</span>
              </div>

            </div>

            <div className="visual-benefits">
              <div>
                <CheckCircle2 size={16} />
                Smart inventory tracking
              </div>
              <div>
                <CheckCircle2 size={16} />
                Expiry date reminders
              </div>
              <div>
                <CheckCircle2 size={16} />
                AI-powered assistance
              </div>
            </div>
          </div>

          <div className="visual-footer">
            <div>
              <Leaf size={16} />
              Built for smarter, sustainable living
            </div>
            <span>© 2026 HomeAI</span>
          </div>

          <div className="visual-decoration decoration-one" />
          <div className="visual-decoration decoration-two" />

        </section>

        {/* RIGHT AUTHENTICATION SECTION */}
        <section className="auth-form-section">

          <div className="auth-form-container">

            <div className="mobile-auth-brand">
              <div className="visual-logo">
                <Home size={25} />
              </div>
              <h2>Home<span>AI</span></h2>
            </div>

            <div className="form-topline">
              <span className="form-welcome-badge">
                <Sparkles size={14} />
                Welcome to HomeAI
              </span>

              <span className="form-secure">
                <ShieldCheck size={15} />
                Secure access
              </span>
            </div>

            <div className="form-heading">
              <h2>
                {isResetPassword
                  ? "Create a new password."
                  : isForgotPassword
                    ? "Reset your password."
                    : isLogin
                      ? "Welcome back."
                      : "Create your account."}
              </h2>

              <p>
                {isResetPassword
                  ? "Choose a new password for your HomeAI account."
                  : isForgotPassword
                    ? "Enter your registered email and we’ll send you a password reset link."
                    : isLogin
                      ? "Your smarter home is just one step away."
                      : "Start managing your home the smarter way."}
              </p>
            </div>

            {!isForgotPassword && !isResetPassword && <>
            {/* GOOGLE LOGIN */}
            <div className="google-auth-wrapper">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() =>
                  setError("Google authentication failed")
                }
                text="continue_with"
                shape="rectangular"
                theme="outline"
                size="large"
                width="100%"
                useOneTap={false}
              />

              {googleLoading && (
                <p className="google-loading">
                  Signing in with Google...
                </p>
              )}
            </div>

            <div className="auth-divider">
              <span>{isForgotPassword ? "PASSWORD RECOVERY" : "OR CONTINUE WITH EMAIL"}</span>
            </div>
            </>}

            <form onSubmit={handleSubmit} className="auth-form">

              {!isLogin && !isForgotPassword && !isResetPassword && (
                <label className="auth-label">
                  Full Name

                  <div className="auth-input">
                    <User size={18} />

                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name: e.target.value,
                        })
                      }
                      minLength={2}
                      required
                    />
                  </div>
                </label>
              )}

              {!isResetPassword && <label className="auth-label">
                Email Address

                <div className="auth-input">
                  <Mail size={18} />

                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        email: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </label>}

              {(!isForgotPassword || isResetPassword) && <label className="auth-label">
                Password

                <div className="auth-input">
                  <Lock size={18} />

                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        password: e.target.value,
                      })
                    }
                    minLength={8}
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(!showPassword)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />}
                  </button>
                </div>
              </label>}

              {isResetPassword && (
                <label className="auth-label">
                  Confirm New Password
                  <div className="auth-input">
                    <Lock size={18} />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                </label>
              )}

              {error && (
                <div className="auth-error">
                  {error}
                </div>
              )}

              {success && (
                <div className="auth-success">
                  {success}
                </div>
              )}

              {isLogin && !isForgotPassword && !isResetPassword && (
                <div className="auth-forgot-row">
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError("");
                      setSuccess("");
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={loading || googleLoading}
              >
                <span>
                  {loading
                    ? "Please wait..."
                    : isResetPassword
                      ? "Update Password"
                      : isForgotPassword
                        ? "Send Reset Link"
                        : isLogin
                        ? "Sign In"
                        : "Create Account"}
                </span>

                {!loading && <ArrowRight size={19} />}
              </button>

            </form>

            <div className="auth-switch">
              <span>
                {isForgotPassword || isResetPassword
                  ? "Remember your password?"
                  : isLogin
                    ? "Don't have an account?"
                    : "Already have an account?"}
              </span>

              <button
                type="button"
                onClick={() => {
                  if (isForgotPassword || isResetPassword) {
                    setIsForgotPassword(false);
                    setIsResetPassword(false);
                    setIsLogin(true);
                    setError("");
                    setSuccess("");
                    setConfirmPassword("");
                    window.history.replaceState({}, document.title, window.location.pathname);
                  } else {
                    switchMode();
                  }
                }}
              >
                {isForgotPassword || isResetPassword ? "Sign in" : isLogin ? "Create account" : "Sign in"}
              </button>
            </div>

            <div className="auth-trust">
              <ShieldCheck size={17} />
              <span>
                Your data is private and securely protected.
              </span>
            </div>

          </div>

        </section>
      </div>
    </div>
  );
}