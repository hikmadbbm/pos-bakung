"use client";
import { useState } from "react";
import { api, setAuth } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { useRouter } from "next/navigation";
import { useToast } from "../../components/ui/use-toast";
import Image from "next/image";
import { Fingerprint, ArrowRight, Lock, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "../../media/Logo.png";
import LogoB from "../../media/logo B.png";
import LogoBBlack from "../../media/logo B black.png";
import PostLoginModal from "../../components/PostLoginModal";
import { base64URLToBuffer, bufferToBase64URL } from "../../lib/webauthn-utils";
import { cn } from "../../lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [mobileStep, setMobileStep] = useState(1); // 1 = Splash, 2 = Form
  
  // Forgot Password States
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Username, 2: OTP + New Pass
  const [forgotUsername, setForgotUsername] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await api.post("/auth/forgot-password/request", { username: forgotUsername });
      setMaskedPhone(res.phone_masked);
      setForgotStep(2);
      success(res.message || "OTP has been sent!");
    } catch (err) {
      toastError(err.response?.data?.error || "Failed to request OTP");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      await api.post("/auth/forgot-password/reset", { 
        username: forgotUsername, 
        otp, 
        newPassword 
      });
      success("Password changed successfully! You can now log in.");
      setShowForgot(false);
      setForgotStep(1);
    } catch (err) {
      toastError(err.response?.data?.error || "Reset failed");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.post("/auth/login", { username, password });
      setAuth(data.token, data.user);
      setCurrentUser(data.user);
      setShowModal(true);
    } catch (err) {
      console.error("Login error:", err);
      let errorMessage = "Login failed. Please check your credentials.";
      if (err.response?.data?.error) errorMessage = err.response.data.error;
      setError(errorMessage);
      setLoading(false);
    } finally {
      if (!showModal) setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Placeholder for future Google OAuth logic
    toastError("Google Login is being configured. Please use your credentials or Biometrics.");
  };

  const handleBiometricLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const options = await api.get(`/auth/webauthn/login${username ? `?username=${username}` : ""}`);
      options.challenge = base64URLToBuffer(options.challenge);
      if (options.allowCredentials) {
        options.allowCredentials = options.allowCredentials.map(c => ({
          ...c,
          id: base64URLToBuffer(c.id)
        }));
      }
      const credential = await navigator.credentials.get({ publicKey: options });
      if (!credential) throw new Error("No credential returned");
      const body = {
        id: credential.id,
        rawId: bufferToBase64URL(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: bufferToBase64URL(credential.response.authenticatorData),
          clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
          signature: bufferToBase64URL(credential.response.signature),
          userHandle: credential.response.userHandle ? bufferToBase64URL(credential.response.userHandle) : null,
        }
      };
      const data = await api.post("/auth/webauthn/login", body);
      setAuth(data.token, data.user);
      setCurrentUser(data.user);
      setShowModal(true);
    } catch (err) {
      console.error("Biometric login failed:", err);
      setError("Biometric authentication failed or canceled.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900 relative">
      
      {/* --- Visual Experience (Step 1 on Mobile) --- */}
      <div className={cn(
        "absolute inset-0 lg:relative lg:w-3/5 flex flex-col overflow-hidden bg-emerald-950 transition-all duration-700 ease-in-out z-20",
        mobileStep === 2 ? "-translate-x-full lg:translate-x-0" : "translate-x-0"
      )}>
        {/* Custom Mesh Gradient Background */}
        <div className="absolute inset-0 opacity-40">
            <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-emerald-500 blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-teal-600 blur-[100px] animate-bounce duration-[10s]" />
            <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-400 blur-[90px] opacity-30" />
        </div>

        {/* Floating Abstract Spheres */}
        <div className="absolute top-[15%] left-[20%] w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-300 shadow-2xl animate-bounce duration-[4s] opacity-80" />
        <div className="absolute bottom-[20%] left-[40%] w-48 h-48 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-900 shadow-inner translate-y-10 blur-sm opacity-60" />
        <div className="absolute top-[40%] right-[20%] w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 animate-pulse duration-[3s]" />

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between h-full p-8 lg:p-16">
          <div className="flex items-center justify-center lg:justify-start gap-4">
            <div className="bg-emerald-500/10 backdrop-blur-xl p-2 rounded-2xl border border-emerald-400/20 overflow-hidden">
                <Image src={LogoB} alt="Bakung Logo" className="w-10 h-10 object-contain" />
            </div>
            <span className="text-white font-black tracking-widest text-lg uppercase italic">Bakung <span className="text-emerald-400">POS</span></span>
          </div>

          <div className="space-y-6 lg:space-y-8 flex flex-col items-center lg:items-start text-center lg:text-left">
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tighter">
              Welcome <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 uppercase italic">BACK!</span>
            </h1>
            <p className="text-emerald-100/60 max-w-sm mx-auto lg:mx-0 text-base lg:text-lg font-medium leading-relaxed">
              Take control of your store performance and track your inventory in real-time.
            </p>
            
            {/* Step 1 CTA for Mobile */}
            <div className="lg:hidden pt-8">
              <Button 
                onClick={() => setMobileStep(2)}
                className="w-full h-14 rounded-2xl bg-white/5 border-2 border-white/20 backdrop-blur-md text-white font-black uppercase tracking-widest text-xs gap-2 group hover:bg-white/10 transition-all active:scale-95"
              >
                Login to Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            <div className="hidden lg:flex gap-4 pt-4">
                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Status</p>
                    <div className="text-sm font-bold text-white uppercase italic tracking-wider flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> LIVE UPDATES
                    </div>
                </div>
                <div className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                    <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest mb-1">Encrypted</p>
                    <div className="text-sm font-bold text-white uppercase italic tracking-wider">
                        DATA PROTECTED
                    </div>
                </div>
            </div>
          </div>

          <div className="text-emerald-400/50 text-[10px] uppercase font-black tracking-[0.3em] text-center lg:text-left">
            Powered by Bakung Studio Neural v2.4
          </div>
        </div>
      </div>

      {/* --- Form Experience (Step 2 on Mobile) --- */}
      <div className={cn(
        "absolute inset-0 lg:relative lg:w-2/5 flex flex-col justify-center p-6 sm:p-12 lg:p-20 bg-white transition-all duration-700",
        mobileStep === 1 ? "translate-x-full lg:translate-x-0" : "translate-x-0"
      )}>
        <div className="max-w-md w-full mx-auto space-y-6 lg:space-y-12">
          {/* Back Button for Mobile */}
          <button 
            type="button"
            onClick={() => setMobileStep(1)}
            className="lg:hidden flex items-center gap-2 text-slate-400 font-black uppercase text-[10px] tracking-widest mb-4 hover:text-emerald-600 transition-colors"
          >
            <ArrowRight className="w-3 h-3 rotate-180" /> Back
          </button>

          <div className="flex flex-col mb-6 lg:mb-12 space-y-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100 lg:hidden overflow-hidden p-2">
                <Image src={LogoBBlack} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="space-y-1">
                <h2 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    Log In <div className="hidden lg:flex w-10 h-10 items-center justify-center -mt-1"><Image src={LogoBBlack} alt="Logo" className="w-full h-full object-contain" /></div>
                </h2>
                <div className="text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-relaxed">
                    Verification required to access terminal dashboard
                </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              <div className="space-y-2 group">
                <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1 group-focus-within:text-emerald-600 transition-colors">Username Handle</Label>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500">
                        <User className="w-5 h-5" />
                    </div>
                    <Input
                        id="username"
                        type="text"
                        placeholder="admin_bakung"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 shadow-sm transition-all"
                    />
                </div>
              </div>
              
              <div className="space-y-2 group">
                <div className="flex justify-between items-center pl-1">
                    <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-focus-within:text-emerald-600 transition-colors">Secure Key</Label>
                    <button 
                      type="button" 
                      onClick={() => setShowForgot(true)}
                      className="text-[9px] font-black uppercase text-emerald-600 hover:text-emerald-700 tracking-widest"
                    >
                      Forgot?
                    </button>
                </div>
                <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500">
                        <Lock className="w-5 h-5" />
                    </div>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 shadow-sm transition-all"
                    />
                </div>
              </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in shake duration-300">
                    <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                    </div>
                    <p className="text-xs font-bold text-rose-700 leading-tight">{error}</p>
                </div>
            )}

            <div className="space-y-4 pt-4">
                <Button 
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 text-white font-black uppercase tracking-widest text-[11px] gap-2 transition-all active:scale-95 disabled:opacity-50" 
                    type="submit" 
                    disabled={loading}
                >
                    {loading ? "Logging In..." : "Log In"}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>

                <div className="relative flex items-center justify-center py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                    <span className="relative bg-white px-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Secure Access Node</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                      variant="outline" 
                      className="h-14 rounded-2xl border-2 border-slate-100 text-slate-800 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      type="button"
                  >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z" />
                        <path fill="#34A853" d="M16.04 18.013c-1.09.593-2.325.938-3.64.938a7.07 7.07 0 0 1-6.012-3.328l-4.045 3.1c1.977 3.978 6.075 6.704 10.857 6.704 2.854 0 5.465-1.014 7.508-2.703l-4.668-3.711z" />
                        <path fill="#4A90E2" d="M19.834 22.435c2.196-2.022 3.466-4.96 3.466-8.435 0-.88-.094-1.728-.272-2.541H12v4.81h6.116c-.263 1.411-1.066 2.616-2.235 3.393l4.086 3.712z" />
                        <path fill="#FBBC05" d="M5.277 14.124L1.243 17.24a12.015 12.015 0 0 1 0-10.48l4.032 3.114c-.268.746-.425 1.547-.425 2.388 0 .864.15 1.687.427 2.452z" />
                      </svg>
                      Google
                  </Button>

                  <Button 
                      variant="outline" 
                      className="h-14 rounded-2xl border-2 border-slate-100 text-slate-800 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all active:scale-95"
                      onClick={handleBiometricLogin}
                      disabled={loading}
                      type="button"
                  >
                      <Fingerprint className="w-5 h-5 text-emerald-500" />
                      Touch ID
                  </Button>
                </div>
            </div>
          </form>
          
          <div className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-widest pt-8">
             Don&apos;t have an account? <button className="text-emerald-600 font-black hover:underline">Contact System Admin</button>
          </div>
        </div>
      </div>
      
      {showModal && (
        <PostLoginModal 
          isOpen={showModal} 
          user={currentUser} 
          onClose={() => setShowModal(false)} 
        />
      )}

      {/* --- Forgot Password Modal --- */}
      <AnimatePresence>
        {showForgot && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !forgotLoading && setShowForgot(false)}
              className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 lg:p-12"
            >
              <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                  <Fingerprint className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Recover Access</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification via WhatsApp</p>
                </div>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">Target Username</Label>
                    <Input 
                      placeholder="Username" 
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      required
                      className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" 
                    />
                  </div>
                  <Button 
                    disabled={forgotLoading}
                    className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px]"
                  >
                    {forgotLoading ? "Verifying..." : "Send Verification Code"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-center">
                    <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest">OTP Sent to {maskedPhone}</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">6-Digit Code</Label>
                      <Input 
                        placeholder="••••••" 
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        className="h-14 text-center tracking-[1em] font-black text-lg rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-1">New Secure Key</Label>
                      <Input 
                        type="password"
                        placeholder="••••••••" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="h-14 rounded-2xl bg-slate-50 border-slate-100 focus:bg-white" 
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button 
                      disabled={forgotLoading}
                      className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest text-[11px]"
                    >
                      {forgotLoading ? "Resetting..." : "Update Password"}
                    </Button>
                    <button 
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="w-full text-[9px] font-black uppercase text-slate-400 hover:text-emerald-600 tracking-widest"
                    >
                      Resend or Change Account
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
