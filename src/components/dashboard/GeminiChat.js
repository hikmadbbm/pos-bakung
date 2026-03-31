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
          className="fixed bottom-24 right-6 lg:bottom-10 lg:right-10 w-16 h-16 bg-gradient-to-tr from-emerald-800 to-green-600 text-white rounded-full 
                     shadow-[0_20px_50px_rgba(5,150,105,0.4)] hover:shadow-emerald-500/40 hover:-translate-y-2 transition-all duration-300 z-[100] flex items-center justify-center group"
        >
          <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400/20" />
          <Sparkles className="w-6 h-6 group-hover:scale-125 transition-transform" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className={cn(
            "fixed bottom-24 right-6 lg:bottom-10 lg:right-10 w-[85vw] md:w-[400px] bg-white border border-slate-100 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] rounded-[2.5rem] overflow-hidden flex flex-col z-[100] transition-all duration-500",
            isMinimized ? "h-[80px]" : "h-[600px] max-h-[70vh] md:max-h-[80vh]"
          )}
        >
          {/* Header */}
          <div className="p-6 bg-slate-900 text-white flex items-center justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center animate-pulse">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">Gemini Assistant</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">AI Business Consultant</p>
              </div>
            </div>
            <div className="flex items-center gap-2 relative z-10">
              <button 
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
                title="Minimize"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/30"
              >
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-50">
                    <div className="p-4 bg-emerald-50 rounded-3xl">
                       <MessageSquare className="w-8 h-8 text-emerald-800" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest max-w-[200px]">
                      Halo! Tanyakan apapun tentang data bisnis Anda hari ini.
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
                        "max-w-[85%] p-4 rounded-[1.5rem] text-[13px] font-bold leading-relaxed shadow-sm",
                        msg.role === 'user' 
                          ? "bg-emerald-800 text-white rounded-tr-none" 
                          : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                      )}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-slate-100 p-4 rounded-[1.5rem] rounded-tl-none flex items-center gap-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Berpikir...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <form 
                onSubmit={handleSend}
                className="p-6 bg-white border-t border-slate-100 flex items-center gap-3"
              >
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about business data..."
                  className="flex-1 bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-3 bg-emerald-800 text-white rounded-xl hover:bg-emerald-900 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200 active:scale-90"
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
