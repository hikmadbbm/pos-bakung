"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { 
  BarChart, 
  ShoppingCart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Printer, 
  RefreshCw,
  FileText
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import { useTranslation } from "../../../lib/language-context";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Link from "next/link";

export default function ReportsPage() {
  const { t } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sales, setSales] = useState(null);
  const [profit, setProfit] = useState(null);
  const [menuPerf, setMenuPerf] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = (from || to) ? `?from=${from || ""}&to=${to || ""}` : "";
      const [s, p, m] = await Promise.all([
        api.get(`/reports/sales${qs}`),
        api.get(`/reports/profit${qs}`),
        api.get(`/reports/menu-performance${qs}`)
      ]);
      setSales(s);
      setProfit(p);
      setMenuPerf(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePrint = async () => {
    const reportElement = document.getElementById('sales-report-content');
    if (!reportElement) {
      window.print();
      return;
    }

    try {
      setLoading(true);
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const printHidden = clonedDoc.querySelectorAll('.print\\:hidden');
          printHidden.forEach(el => el.style.display = 'none');
          
          const printBlock = clonedDoc.querySelectorAll('.print\\:block');
          printBlock.forEach(el => el.style.display = 'block');
          
          const reportContent = clonedDoc.getElementById('sales-report-content');
          if (reportContent) {
            reportContent.style.padding = '40px';
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `LAPORAN_PENJUALAN_${from || 'ALL'}_TO_${to || 'PRESENT'}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error("PDF Export Error:", err);
      window.print();
    } finally {
      setLoading(false);
    }
  };

  // Print-specific view component
  const PrintHeader = () => (
    <div className="hidden print:block mb-10 border-b-2 border-slate-900 pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">BAKMIE YOU-TJE</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">{t('reports.title')}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('common.date')}</p>
          <p className="text-sm font-black text-slate-900">
            {from ? new Date(from).toLocaleDateString() : t('common.all')} - {to ? new Date(to).toLocaleDateString() : t('common.all')}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div id="sales-report-content" className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-0">
      <PrintHeader />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('reports.title')}</h2>
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
            {t('reports.subtitle')}
            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button onClick={load} variant="ghost" disabled={loading} className="h-10 px-4 rounded-xl text-slate-400 hover:text-slate-900 border border-slate-100 transition-all">
            <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} /> {t('common.sync')}
          </Button>
          <Link href={`/sales-reports/end-of-day${(from || to) ? `?from=${from || ""}&to=${to || ""}` : ""}`}>
            <Button variant="outline" className="h-10 px-4 rounded-xl text-emerald-600 border-emerald-100 hover:bg-emerald-50 font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all">
              <FileText className="w-3.5 h-3.5 mr-2" /> Closing Summary
            </Button>
          </Link>
          <Button onClick={handlePrint} className="h-10 px-6 rounded-xl bg-slate-900 text-white hover:bg-black font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all active:scale-95">
            <Printer className="w-3.5 h-3.5 mr-2" /> {t('common.print')}
          </Button>
        </div>
      </div>
      
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 ml-1">{t('reports.from_date')}</Label>
              <Input 
                type="date" 
                value={from} 
                onChange={(e) => setFrom(e.target.value)} 
                className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 ml-1">{t('reports.to_date')}</Label>
              <Input 
                type="date" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
                className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-slate-800"
              />
            </div>
            <Button onClick={load} disabled={loading} className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold text-xs uppercase tracking-widest text-[10px]">
              {loading ? t('common.saving') : t('reports.update_view')}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    {t('reports.performance_summary')}
                 </h3>
                  {sales ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{t('reports.total_orders')}</p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums">{sales.total_orders}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-50 overflow-hidden">
                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-wider mb-1">{t('reports.gross_revenue')}</p>
                        <p className="text-lg sm:text-2xl font-bold text-emerald-600 tabular-nums truncate whitespace-nowrap">{formatIDR(sales.revenue)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center border border-dashed border-slate-100 rounded-xl text-[10px] font-bold text-slate-300 uppercase">{t('shift.no_records')}</div>
                  )}
              </div>

          {/* Profit Summary */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                {t('reports.profit_analysis')}
             </h3>
              {profit ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('reports.revenue')}</span>
                    <span className="text-sm font-bold text-slate-700 tabular-nums">{formatIDR(profit.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-rose-50 rounded-lg">
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">{t('reports.cogs')}</span>
                    <span className="text-sm font-bold text-rose-500 tabular-nums">-{formatIDR(profit.cogs)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-900 rounded-xl mt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('reports.net_profit')}</span>
                    <span className={cn("text-lg font-bold tabular-nums", profit.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatIDR(profit.netProfit)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center border border-dashed border-slate-100 rounded-xl text-[10px] font-bold text-slate-300 uppercase">{t('common.no_data')}</div>
              )}
          </div>
        </div>

        {/* Print Summary (Table style for print) */}
        <div className="hidden print:block space-y-6">
           <div className="grid grid-cols-2 gap-8 border rounded-2xl p-8">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('reports.performance_summary')}</p>
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-600">{t('reports.total_orders')}</span>
                    <span className="text-xs font-black">{sales?.total_orders || 0}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-600">{t('reports.gross_revenue')}</span>
                    <span className="text-xs font-black">{formatIDR(sales?.revenue || 0)}</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('reports.profit_analysis')}</p>
                <div className="space-y-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-600">{t('reports.revenue')}</span>
                    <span className="text-xs font-black">{formatIDR(profit?.revenue || 0)}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-xs font-bold text-slate-600">{t('reports.cogs')}</span>
                    <span className="text-xs font-black text-rose-600">{formatIDR(profit?.cogs || 0)}</span>
                  </div>
                  <div className="flex justify-between pt-2">
                    <span className="text-xs font-black uppercase text-slate-900">{t('reports.net_profit')}</span>
                    <span className="text-sm font-black text-emerald-600">{formatIDR(profit?.netProfit || 0)}</span>
                  </div>
                </div>
              </div>
           </div>
        </div>

        {/* Menu Performance */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                   <BarChart className="w-5 h-5 text-emerald-600" />
                 </div>
                 {t('reports.best_sellers')}
              </h3>
          </div>
          <ResponsiveDataView
            loading={loading}
            data={menuPerf}
            emptyMessage={t('shift.no_records')}
            columns={[
              {
                header: t('common.name'),
                accessor: (row) => <span className="font-bold text-slate-800 text-sm">{row.name}</span>,
                className: "pl-8"
              },
              {
                header: t('reports.qty_sold'),
                accessor: (row) => <span className="font-semibold text-slate-500 tabular-nums">{row.qty}</span>,
                align: "right"
              },
              {
                header: t('reports.gross_rev'),
                accessor: (row) => <span className="font-medium text-slate-400 tabular-nums">{formatIDR(row.revenue)}</span>,
                align: "right"
              },
              {
                header: t('reports.total_profit'),
                accessor: (row) => <span className="font-bold text-emerald-600 tabular-nums">{formatIDR(row.profit)}</span>,
                align: "right",
                className: "pr-8"
              }
            ]}
            renderCard={(row) => (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-slate-800 text-base">{row.name}</p>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('reports.qty_sold')}</p>
                    <p className="font-bold text-slate-800 text-lg tabular-nums tracking-tight">{row.qty}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('reports.gross_rev')}</p>
                    <p className="font-semibold text-slate-500 text-sm tabular-nums">{formatIDR(row.revenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('reports.net_profit')}</p>
                    <p className="font-bold text-emerald-600 text-base tabular-nums tracking-tight">{formatIDR(row.profit)}</p>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
