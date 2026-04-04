"use client";
import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, MessageSquare, Loader2, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { api } from "../../lib/api";

export default function GeminiChat({ contextData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const history = messages.slice(-6); // Only last 3 exchanges
      const data = await api.post("/ai/chat", { 
        message: input, 
        history,
        context: contextData 
      });
      
      setMessages(prev => [...prev, { role: "ai", text: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "ai", text: "Maaf, sistem AI sedang offline. Coba lagi sebentar lagi!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 w-14 h-14 bg-gradient-to-tr from-emerald-800 to-green-600 text-white rounded-2xl 
                     shadow-[0_15px_30px_rgba(5,150,105,0.4)] hover:shadow-emerald-500/40 hover:-translate-y-1 transition-all duration-300 z-[100] flex items-center justify-center group"
        >
          <div className="absolute inset-0 rounded-2xl animate-pulse bg-emerald-400/20" />
          <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={cn(
            "fixed bottom-24 right-6 lg:bottom-10 lg:right-10 w-[85vw] md:w-[350px] bg-white border border-slate-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[2rem] overflow-hidden flex flex-col z-[100] transition-all duration-500",
            isMinimized ? "h-[70px]" : "h-[550px] max-h-[75vh]"
          )}
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/20">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Gemini Assistant</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">AI Analyst</p>
              </div>
            </div>
            <div className="flex items-center gap-1 relative z-10">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                title="Minimize"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50"
              >
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-40">
                    <div className="p-4 bg-white rounded-[2rem] shadow-sm border border-slate-100">
                       <MessageSquare className="w-6 h-6 text-emerald-800" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest max-w-[150px]">
                      Tanyakan data bisnis hari ini.
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div 
                      className={cn(
                        "max-w-[90%] p-3 px-4 rounded-[1.2rem] text-[12px] font-medium leading-relaxed shadow-sm",
                        msg.role === 'user' 
                          ? "bg-slate-900 text-white rounded-tr-none" 
                          : "bg-white border border-slate-100 text-slate-800 rounded-tl-none font-bold"
                      )}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 p-3 px-4 rounded-[1.2rem] rounded-tl-none flex items-center gap-2 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1 h-1 bg-emerald-600 rounded-full animate-bounce" />
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Processing...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <form 
                onSubmit={handleSend}
                className="p-4 bg-white border-t border-slate-100 flex items-center gap-2"
              >
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ketik pesan..."
                  className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-1 focus:ring-emerald-500 transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
