"use client";
import { useState, useEffect } from "react";
import { api } from "../../../../lib/api";
import { formatIDR } from "../../../../lib/format";
import { Button } from "../../../../components/ui/button";
import { Printer, RefreshCw, ArrowLeft, Download, FileText, TrendingUp, TrendingDown, DollarSign, Wallet, Smartphone } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useSearchParams } from "next/navigation";
import { cn } from "../../../../lib/utils";
import Link from "next/link";

export default function EndOfDayReportPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const load = async () => {
    setLoading(true);
    try {
      const qs = (from || to) ? `?from=${from || ""}&to=${to || ""}` : "";
      const res = await api.get(`/reports/end-of-day${qs}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [from, to]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("printable-report");
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`End-Of-Day-Report-${new Date(data.date).toLocaleDateString('id-ID')}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Gagal membuat PDF");
    }
  };

  const handleShareWA = () => {
    let text = `*LAPORAN TUTUP TOKO ${new Date(data.date).toLocaleDateString('id-ID')}*\n`;
    text += `TOTAL PENJUALAN KOTOR: ${formatIDR(data.summary.gross_sales)}\n`;
    text += `PENDAPATAN BERSIH: ${formatIDR(data.summary.net_revenue)}\n`;
    text += `TOTAL HPP: ${formatIDR(data.summary.cogs)}\n`;
    text += `TOTAL PENGELUARAN: ${formatIDR(data.summary.expenses)}\n`;
    text += `--------------------------------------\n`;
    text += `*PROFIT BERSIH: ${formatIDR(data.summary.net_profit)}*\n`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <RefreshCw className="w-8 h-8 text-slate-400 animate-spin" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Aggregating Today's Data...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto pb-20 px-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-10 print:hidden">
        <Link href="/sales-reports">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900 gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Reports
          </Button>
        </Link>
        <div className="flex gap-2">
           <Button onClick={load} variant="outline" className="gap-2 border-slate-200">
             <RefreshCw className="w-4 h-4" /> Sync
           </Button>
           <Button onClick={handleExportPDF} className="bg-blue-600 text-white hover:bg-blue-700 gap-2 font-bold shadow-lg">
             <FileText className="w-4 h-4" /> PDF
           </Button>
           <Button onClick={handleShareWA} className="bg-emerald-500 text-white hover:bg-emerald-600 gap-2 font-bold shadow-lg">
             <Smartphone className="w-4 h-4" /> WA
           </Button>
           <Button onClick={handlePrint} className="bg-slate-900 text-white hover:bg-black gap-2 font-bold shadow-lg">
             <Printer className="w-4 h-4" /> Print
           </Button>
        </div>
      </div>

      {/* Report Content */}
      <div id="printable-report" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl overflow-hidden print:border-none print:shadow-none">
        {/* Report Banner */}
        <div className="bg-slate-900 p-12 text-white text-center relative overflow-hidden print:bg-white print:text-slate-900 print:border-b-2 print:border-slate-900 print:p-6">
           {/* Decorative Background Element */}
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
           
           <div className="relative z-10 flex flex-col items-center">
              <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-2 text-white drop-shadow-sm">BAKMIE YOU-TJE</h1>
              <h2 className="text-lg font-black uppercase tracking-[0.4em] text-emerald-400 print:text-slate-900">END-OF-DAY SUMMARY</h2>
           </div>
           <p className="text-xs font-bold opacity-60 uppercase tracking-[0.3em] mt-2">
             {data.date.includes('to') ? (
               `Period: ${data.date}`
             ) : (
               `Date: ${new Date(data.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`
             )}
           </p>
        </div>

        <div className="p-10 space-y-12 print:p-6">
           {/* Section 1: Financial Totals */}
           <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b pb-2">Financial Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                    <span className="text-sm font-bold text-slate-600">Gross Sales</span>
                    <span className="text-lg font-black text-slate-900">{formatIDR(data.summary.gross_sales)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4">
                    <span className="text-sm font-bold text-slate-400 italic">Discounts</span>
                    <span className="text-sm font-bold text-rose-500">-{formatIDR(data.summary.discounts)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-50 p-5 rounded-2xl border border-emerald-100">
                    <span className="text-sm font-black text-emerald-800 uppercase">Net Revenue (After Commission)</span>
                    <span className="text-xl font-black text-emerald-900">{formatIDR(data.summary.net_revenue)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center px-4">
                    <span className="text-sm font-bold text-slate-600">Cost of Goods (COGS)</span>
                    <span className="text-sm font-black text-rose-700">{formatIDR(data.summary.cogs)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 border-b border-dashed pb-4">
                    <span className="text-sm font-bold text-slate-600">Operating Expenses</span>
                    <span className="text-sm font-black text-rose-700">{formatIDR(data.summary.expenses)}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/20">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Profit</span>
                      <p className="text-2xl font-black tabular-nums">{formatIDR(data.summary.net_profit)}</p>
                    </div>
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", data.summary.net_profit >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400")}>
                      {data.summary.net_profit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                    </div>
                  </div>
                </div>
              </div>
           </section>

           {/* Section 2: Payments & Methods */}
           <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b pb-2">Payment Collection</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {data.payment_breakdown.map((pm, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{pm.name}</p>
                    <p className="text-sm font-black text-slate-800">{formatIDR(pm.amount)}</p>
                  </div>
                ))}
              </div>
           </section>

           {/* Section 3: Shift Log */}
           <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b pb-2">Cashier Shift Summary</h3>
              <div className="border border-slate-100 rounded-3xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 font-black uppercase text-slate-400">
                    <tr>
                      <th className="px-6 py-4">Cashier</th>
                      <th className="px-6 py-4 text-center">Time</th>
                      <th className="px-6 py-4 text-right">Start Cash</th>
                      <th className="px-6 py-4 text-right">Actual End Cash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.shifts.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5 font-black text-slate-800">{s.operator}</td>
                        <td className="px-6 py-5 text-center text-slate-500 font-medium">
                          {new Date(s.started).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}
                          {s.ended ? ` - ${new Date(s.ended).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })}` : ' (Active)'}
                        </td>
                        <td className="px-6 py-5 text-right font-bold text-slate-600 tabular-nums">{formatIDR(s.starting_cash)}</td>
                        <td className="px-6 py-5 text-right font-black text-slate-900 tabular-nums">{formatIDR(s.actual_cash || s.expected_cash)}</td>
                      </tr>
                    ))}
                    {data.shifts.length === 0 && (
                      <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-300 font-black uppercase italic">No shifts recorded today</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
           </section>

           {/* Section 4: Top Products */}
           <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 border-b pb-2">Top Performance Products</h3>
              <div className="space-y-3">
                 {data.top_menus.map((m, idx) => (
                   <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                      <div className="flex items-center gap-4">
                        <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shrink-0">{idx+1}</span>
                        <span className="text-sm font-black text-slate-800">{m.name}</span>
                      </div>
                      <span className="text-sm font-black text-slate-500">{m.qty} Units</span>
                   </div>
                 ))}
              </div>
           </section>

           <div className="pt-10 border-t border-dashed text-center">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Tutup Toko Berhasil — {new Date().toLocaleTimeString()}</p>
           </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { 
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
