"use client";

import React, { useState, useRef } from "react";
import { 
  Camera, Upload, FileText, X, 
  RotateCcw, Check, Sparkles, 
  Info, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import Portal from "./Portal";

export default function PurchaseOCR({ isOpen, onClose, onItemsExtracted }) {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          
          // Output slightly lower quality to keep size small
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          resolve(dataUrl);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    const compressed = await compressImage(file);
    setPreview(compressed);
    setImage(compressed);
    setLoading(false);
  };

  const processOCR = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const data = await api.post("/purchases/ocr", { image });
      setResults(data);
    } catch (e) {
      console.error(e);
      alert("Failed to process receipt. Please ensure it's clear and text is visible.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!results) return;
    onItemsExtracted(results);
    onClose();
  };

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,0.3)] flex flex-col border border-slate-100"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white sticky top-0 z-10">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tight">AI OCR Intake</h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automated receipt processing</p>
                   </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {!results ? (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center space-y-6">
                     {preview ? (
                       <div className="relative group animate-in zoom-in-95">
                          <img src={preview} className="max-w-[240px] h-auto rounded-2xl shadow-xl border-4 border-white transition-transform" />
                          <button 
                             onClick={() => { setPreview(null); setImage(null); }}
                             className="absolute -top-2 -right-2 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                          >
                             <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                       </div>
                     ) : (
                       <div 
                         onClick={() => fileInputRef.current?.click()}
                         className="w-full max-w-sm aspect-[4/3] border-2 border-dashed border-slate-200 rounded-[1.5rem] hover:border-emerald-500 hover:bg-emerald-50/30 group cursor-pointer transition-all flex flex-col items-center justify-center gap-4"
                       >
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-emerald-500 transition-all shadow-sm">
                             <Camera className="w-6 h-6 text-slate-400 group-hover:text-white" />
                          </div>
                          <div className="space-y-1">
                             <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Drop receipt photo here</p>
                             <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">JPG, PNG, WEBP</p>
                          </div>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                       </div>
                     )}

                     <div className="max-w-xs p-4 bg-slate-50 rounded-2xl flex items-start gap-3">
                        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-400 leading-relaxed text-left uppercase font-bold tracking-tight">
                           Ensure flat surface and good lighting for best extraction results.
                        </p>
                     </div>

                     <Button 
                       disabled={!preview || loading}
                       onClick={processOCR}
                       className="h-14 px-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200/50 text-[10px] font-bold uppercase tracking-widest active:scale-95 transition-all"
                     >
                        {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing...</> : "Start Vision Intelligence"}
                     </Button>
                  </div>
                ) : (
                  <div className="space-y-8 animate-in fade-in duration-500">
                     {/* Results Header */}
                     <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                           <Check className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Supplier Detected</p>
                           <h4 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight">{results.supplier || "Unknown"}</h4>
                        </div>
                        <div className="text-right">
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Date</p>
                           <p className="text-[11px] font-bold text-slate-500 uppercase">{results.date || "Today"}</p>
                        </div>
                     </div>

                     {/* Results Table */}
                     <div className="space-y-3">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                           <FileText className="w-3.5 h-3.5" /> Detected Materials
                        </h5>
                        <div className="grid grid-cols-1 gap-2">
                           {results.items?.map((item, idx) => (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:border-emerald-200 transition-all shadow-sm">
                                 <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-[9px] text-slate-300">
                                       0{idx+1}
                                    </div>
                                    <div>
                                       <p className="font-bold text-slate-900 uppercase tracking-tight text-base">{item.name}</p>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                          {item.quantity} {item.unit || "pcs"} • {formatIDR(item.unit_price)}
                                       </p>
                                    </div>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-lg font-extrabold text-slate-900 tabular-nums tracking-tighter">{formatIDR(item.total_price)}</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     <div className="flex gap-3 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={() => { setResults(null); }}
                          className="flex-1 h-12 rounded-xl border-slate-100 font-bold uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50"
                        >
                          Rescan
                        </Button>
                        <Button 
                          onClick={handleConfirm}
                          className="flex-[2] h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          Confirm & Import
                        </Button>
                     </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
