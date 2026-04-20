"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/ui/use-toast";
import { Fingerprint, Smartphone, ShieldCheck, Trash2, ShieldAlert } from "lucide-react";
import { useTranslation } from "../../../lib/language-context";
import { base64URLToBuffer, bufferToBase64URL } from "../../../lib/webauthn-utils";
import { cn } from "../../../lib/utils";

export default function SecuritySettings() {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [authenticators, setAuthenticators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    loadAuthenticators();
  }, []);

  const loadAuthenticators = async () => {
    try {
      const res = await api.get("/auth/webauthn/list");
      setAuthenticators(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const registerBiometric = async () => {
    try {
      setIsRegistering(true);
      
      // 1. Get options
      const options = await api.get("/auth/webauthn/options");
      
      // 2. Transfrom from Base64
      options.challenge = base64URLToBuffer(options.challenge);
      options.user.id = new TextEncoder().encode(options.user.id);
      
      // 3. Create credential
      const credential = await navigator.credentials.create({ publicKey: options });
      
      if (!credential) {
        throw new Error("Registration canceled");
      }

      // 4. Transform to send to server
      const body = {
        id: credential.id,
        rawId: bufferToBase64URL(credential.rawId),
        type: credential.type,
        response: {
          clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
          attestationObject: bufferToBase64URL(credential.response.attestationObject),
          // We can also extract the public key if needed, or server can do it from attestation
        }
      };
      
      await api.post("/auth/webauthn/register", body);
      success("Biometric device registered successfully!");
      loadAuthenticators();
    } catch (err) {
      console.error("Registration error:", err);
      error("Failed to register biometric device. Make sure your device supports it.");
    } finally {
      setIsRegistering(false);
    }
  };

  const removeAuthenticator = async (id) => {
    try {
      await api.delete(`/auth/webauthn/remove?id=${id}`);
      success("Device removed.");
      loadAuthenticators();
    } catch (e) {
      error("Failed to remove device.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto space-y-10">
      <div className="glass-card rounded-[3rem] overflow-hidden p-0 border-none shadow-2xl bg-white">
        <div className="p-10 bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-tight uppercase text-white">Security & Biometrics</h3>
              <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.2em] mt-1">Protect your account with Passkeys</p>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12 space-y-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 shadow-inner">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 rounded-[2rem] bg-white flex items-center justify-center shadow-xl">
                 <Fingerprint className="w-10 h-10 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">Enable Biometric Login</h4>
                <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">Use FaceID or Fingerprint for faster access</p>
              </div>
            </div>
            <Button 
              size="lg" 
              onClick={registerBiometric}
              disabled={isRegistering}
              className="w-full md:w-auto h-16 px-10 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-2xl disabled:opacity-50"
            >
              {isRegistering ? "Registering..." : "Add New Device"}
            </Button>
          </div>

          <div className="space-y-6">
            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3 ml-2">
              <Smartphone className="w-4 h-4" /> Registered Devices
            </h5>
            
            {loading ? (
              <div className="h-20 animate-pulse bg-slate-50 rounded-3xl" />
            ) : authenticators.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {authenticators.map((auth) => (
                  <div key={auth.id} className="p-6 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{auth.credentialDeviceType || "Security Key"}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">ID: ...{auth.credentialID.slice(-8)}</p>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeAuthenticator(auth.id)}
                      className="opacity-0 group-hover:opacity-100 text-rose-300 hover:text-rose-600 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No biometric devices found</p>
                <p className="text-[9px] text-slate-300 font-bold uppercase mt-1">Add a device to log in without a password</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
