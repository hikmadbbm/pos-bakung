"use client";
import { useState, useEffect, useRef } from "react";
import { api } from "../../../lib/api";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  RefreshCw, 
  Database, 
  TrendingUp, 
  ShoppingBag, 
  AlertCircle,
  MessageSquare,
  Terminal
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTranslation } from "../../../lib/language-context";

export default function AssistantPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    { 
      role: "assistant", 
      text: "Halo Juragan! Saya Tje Strategic Assistant. Saya siap membantu Anda menganalisa performa Bakmie You-Tje hari ini. Ada yang ingin Anda diskusikan?",
      time: new Date() 
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadContext();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadContext = async () => {
    try {
      const res = await api.get("/dashboard/summary"); 
      setContext(res);
    } catch (e) {
      console.error("Failed to load context", e);
    }
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg, time: new Date() }]);
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", {
        message: userMsg,
        history: messages.slice(-10),
        context: context
      });

      setMessages(prev => [...prev, { 
        role: "assistant", 
        text: res.response, 
        time: new Date() 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        text: "Maaf, koneksi ke sistem pusat terganggu. Saya tetap bisa memantau data lokal jika diperlukan.", 
        time: new Date(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Berapa omzet hari ini?", icon: TrendingUp },
    { label: "Menu apa yang paling laku?", icon: ShoppingBag },
    { label: "Cek bahan yang mau habis", icon: AlertCircle },
    { label: "Siapa yang jaga sekarang?", icon: Database },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex-1 flex flex-col glass-card border-none shadow-2xl rounded-[2.5rem] bg-white/70 backdrop-blur-3xl overflow-hidden relative">
        {/* Header */}
        <div className="px-8 py-6 bg-slate-900 text-white flex items-center justify-between shadow-lg relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Bot className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-[900] tracking-tighter uppercase italic leading-none text-white">TJE STRATEGIC ASSISTANT</h1>
              <div className="flex items-center gap-2 mt-1.5 font-black uppercase text-[8px] tracking-[0.2em] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                V.2.0 NEURAL ANALYST ONLINE
              </div>
            </div>
          </div>
          <div className="hidden md:flex flex-col text-right">
             <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{t('insights.active_intelligence')}</span>
             <span className="text-xs font-black text-emerald-400">BAKMIE YOU-TJE CONTEXT OK</span>
          </div>
        </div>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar scroll-smooth">
          {messages.map((msg, i) => (
            <div key={i} className={cn(
              "flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white border border-slate-100 text-slate-400"
              )}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5 text-emerald-600" />}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-2xl px-6 py-4 text-[13px] leading-relaxed shadow-sm font-medium whitespace-pre-line",
                msg.role === "user" 
                  ? "bg-indigo-600 text-white rounded-tr-none font-bold" 
                  : cn("bg-white border border-slate-100/50 rounded-tl-none font-black text-slate-900", msg.isError ? "border-rose-200 bg-rose-50/30 text-rose-700" : "")
              )}>
                {msg.text}
                <div className={cn(
                  "text-[8px] font-black uppercase mt-2.5 opacity-40 tracking-widest",
                  msg.role === "user" ? "text-white" : "text-slate-400"
                )}>
                  {msg.role.toUpperCase()} • {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-4 animate-pulse">
               <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200">
                  <RefreshCw className="w-5 h-5 animate-spin" />
               </div>
               <div className="bg-slate-50 rounded-2xl rounded-tl-none px-6 py-4 w-32 h-10" />
            </div>
          )}
        </div>

        {/* Footer / Input Area */}
        <div className="p-8 border-t border-slate-100 bg-white/50 space-y-6">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => { setInput(action.label); }}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-emerald-500 hover:text-white transition-all text-[9.5px] font-black uppercase tracking-widest border border-slate-200/50 flex items-center gap-2 group"
              >
                <action.icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                {action.label}
              </button>
            ))}
          </div>
          
          <form onSubmit={handleSend} className="relative group">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300">
               <Terminal className="w-5 h-5 group-focus-within:text-emerald-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Tanyakan apapun tentang bisnis Bakmie You-Tje..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full h-16 pl-16 pr-24 rounded-2xl bg-slate-100/50 border-none focus:ring-8 focus:ring-emerald-500/5 text-sm font-bold text-slate-800 transition-all placeholder:text-slate-300"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 sm:w-auto sm:px-6 rounded-xl bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg active:scale-95 disabled:opacity-30 flex items-center justify-center gap-2"
            >
              <span className="hidden sm:inline">Kirim Pesan</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
