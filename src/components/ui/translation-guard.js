import { RefreshCw } from "lucide-react";
import Image from "next/image";
import LogoB from "../../media/logo B.png";
import { cn } from "../../lib/utils";

export function TranslationGuard() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d1117]/60 backdrop-blur-xl animate-in fade-in duration-700">
      {/* Background Mesh Accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-500/5 rounded-full blur-[100px] animate-bounce duration-[10s]" />
      </div>

      <div className="flex flex-col items-center gap-6 p-12 relative z-10">
        <div className="relative group">
          <div className="absolute inset-0 bg-emerald-500/40 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-80 transition-opacity animate-pulse" />
          <div className="w-24 h-24 bg-white/10 backdrop-blur-2xl rounded-[2rem] border border-white/20 shadow-2xl flex items-center justify-center relative z-10 overflow-hidden p-4">
             <Image src={LogoB} alt="Bakung Logo" className="w-full h-full object-contain" />
          </div>
          
          {/* Orbiting Ring */}
          <div className="absolute inset-[-10px] border border-emerald-500/30 rounded-[2.5rem] animate-[spin_4s_linear_infinite]" />
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.4em] drop-shadow-md">
              Synchronizing Workspace
            </p>
          </div>
          
          <div className="w-40 h-0.5 bg-white/5 rounded-full overflow-hidden mt-2 border border-white/5">
            <div 
              className="w-full h-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 rounded-full animate-[progress_2s_ease-in-out_infinite]" 
              style={{ transformOrigin: '0% 50%' }} 
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes progress {
            0% { transform: scaleX(0); transform-origin: 0% 50%; }
            50% { transform: scaleX(1); transform-origin: 0% 50%; }
            50.1% { transform: scaleX(1); transform-origin: 100% 50%; }
            100% { transform: scaleX(0); transform-origin: 100% 50%; }
          }
        `}</style>
      </div>
    </div>
  );
}
