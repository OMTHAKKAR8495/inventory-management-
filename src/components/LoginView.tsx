"use client";

import React, { useState } from "react";
import { Store, ShieldCheck, UserCheck, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, KeyRound, Sparkles } from "lucide-react";
import { User } from "@/lib/types";

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Forgot / Reset Password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotStep, setForgotStep] = useState<1 | 2>(1); // 1: Request, 2: Reset
  const [forgotMsg, setForgotMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showForgotModal) {
        setShowForgotModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showForgotModal]);

  const handleLogin = async (overrideEmail?: string, overridePassword?: string) => {
    const targetEmail = overrideEmail || email;
    const targetPassword = overridePassword || password;

    if (!targetEmail || !targetPassword) {
      setErrorMsg("Please provide both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        throw new Error(
          res.status >= 500
            ? "Server error while authenticating. Database is initializing."
            : "Invalid response from server. Please try again."
        );
      }

      if (!res.ok) throw new Error(data.error || "Login failed");

      onLoginSuccess(data.user);
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotSubmitting(true);
    setForgotMsg(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to request reset");

      if (data.resetToken) {
        setResetToken(data.resetToken);
        setForgotStep(2);
        setForgotMsg({ type: "success", text: "Reset token generated! Enter your new password below." });
      } else {
        setForgotMsg({ type: "success", text: data.message });
      }
    } catch (err: any) {
      setForgotMsg({ type: "error", text: err.message });
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsForgotSubmitting(true);
    setForgotMsg(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setForgotMsg({ type: "success", text: "Password reset successful! You may now sign in." });
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotStep(1);
        setEmail(forgotEmail);
        setPassword(newPassword);
      }, 1500);
    } catch (err: any) {
      setForgotMsg({ type: "error", text: err.message });
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden text-slate-100">
      {/* Ambient Radial Lights */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 border border-white/20">
            <Store className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            PROVISION<span className="text-blue-400">SMART</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Smart Inventory & Wholesale Provision Management System
          </p>
        </div>

        {/* 1-Click Fast Demo Logins Card */}
        <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-2xl space-y-3">
          <div className="flex items-center gap-1.5 text-blue-400">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Instant 1-Click Demo Login</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleLogin("ashastore@gmail.com", "9558413347@Om")}
              disabled={isLoading}
              className="p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl text-left transition group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                  Admin
                </span>
              </div>
              <div className="text-xs font-bold text-white mt-1.5">Asha Store Admin</div>
              <div className="text-[10px] text-purple-300/80 font-medium">Full financials & users</div>
            </button>

            <button
              type="button"
              onClick={() => handleLogin("manager@provision.store", "manager123")}
              disabled={isLoading}
              className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl text-left transition group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  Staff
                </span>
              </div>
              <div className="text-xs font-bold text-white mt-1.5">Inventory Mgr</div>
              <div className="text-[10px] text-emerald-300/80 font-medium">Stock & bulk updates</div>
            </button>
          </div>
        </div>

        {/* Standard Login Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl space-y-4">
          <h2 className="text-sm font-bold text-white">Sign in to your account</h2>

          {errorMsg && (
            <div className="p-3 bg-red-500/15 border border-red-500/30 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ashastore@gmail.com"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 text-white placeholder:text-slate-500 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden text-xs font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotMsg(null);
                    setForgotStep(1);
                  }}
                  className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/80 text-white placeholder:text-slate-500 rounded-xl border border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-hidden text-xs font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/25 border border-white/20 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                "Authenticating..."
              ) : (
                <>
                  Sign In to Provision System
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security & System Info Footer */}
        <div className="text-center text-[11px] text-slate-500">
          Role-Based Access Control • Supabase Cloud PostgreSQL • Wholesale Ready
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel bg-[#0c1222]/95 border border-white/15 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fade-in text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Password Recovery</h3>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            {forgotMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  forgotMsg.type === "success"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-red-500/15 text-red-300 border-red-500/30"
                }`}
              >
                {forgotMsg.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                )}
                {forgotMsg.text}
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Enter your registered account email to initiate a secure password reset.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your-account@provision.store"
                    className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-white/10 focus:border-blue-500 outline-hidden text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isForgotSubmitting ? "Generating token..." : "Send Reset Token"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <p className="text-xs text-slate-400">
                  Enter the verification token along with your new password.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Reset Token</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-white/10 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-white/10 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isForgotSubmitting}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {isForgotSubmitting ? "Updating Password..." : "Update Password & Sign In"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
