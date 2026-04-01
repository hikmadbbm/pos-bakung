"use client";
import { useEffect, useState, useCallback } from "react";
import { api, getAuth } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { RefreshCw, Printer, Save, CheckCircle, AlertCircle, X, DollarSign, Wallet, Clock, Calendar, BarChart2, Activity } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../components/ui/use-toast";

/* ─────────────────────────────────────────
   Win2000 primitive components
───────────────────────────────────────── */

function Win2kWindow({ title, icon: Icon, children, className = "" }) {
  return (
    <div className={`win2k-window ${className}`}>
      <div className="win2k-titlebar">
        <div className="win2k-titlebar-left">
          {Icon && <Icon size={14} className="win2k-titlebar-icon" />}
          <span>{title}</span>
        </div>
        <div className="win2k-titlebar-btns">
          <button className="win2k-titlebtn">─</button>
          <button className="win2k-titlebtn">□</button>
          <button className="win2k-titlebtn win2k-titlebtn-close">✕</button>
        </div>
      </div>
      <div className="win2k-window-body">{children}</div>
    </div>
  );
}

function Win2kBtn({ children, onClick, disabled, variant = "default", className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "win2k-btn",
        variant === "primary" && "win2k-btn-primary",
        disabled && "win2k-btn-disabled",
        className
      )}
    >
      {children}
    </button>
  );
}

function Win2kInput({ value, onChange, type = "text", placeholder, className = "" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`win2k-input ${className}`}
    />
  );
}

function Win2kTable({ headers, children }) {
  return (
    <div className="win2k-table-wrap">
      <table className="win2k-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} className={h.right ? "text-right" : "text-left"}>{h.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Win2kSummaryCard({ label, value, sub }) {
  return (
    <div className="win2k-stat-box">
      <div className="win2k-stat-label">{label}</div>
      <div className="win2k-stat-value">{value}</div>
      {sub && <div className="win2k-stat-sub">{sub}</div>}
    </div>
  );
}

function Win2kModal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="win2k-overlay">
      <div className="win2k-dialog">
        <div className="win2k-titlebar">
          <div className="win2k-titlebar-left">
            <span>{title}</span>
          </div>
          <div className="win2k-titlebar-btns">
            <button className="win2k-titlebtn win2k-titlebtn-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="win2k-dialog-body">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Main Page
───────────────────────────────────────── */

export default function CashierReportPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [date, setDate] = useState("");

  useEffect(() => {
    setDate(new Date().toISOString().split("T")[0]);
  }, []);

  const [actualCounts, setActualCounts] = useState({});
  const [reconNotes, setReconNotes] = useState("");
  const [submittingRecon, setSubmittingRecon] = useState(false);
  const [reconHistory, setReconHistory] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedRecon, setSelectedRecon] = useState(null);

  const loadReport = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const res = await api.get(`/analytics/cashier-report?date=${date}`);
      setReport(res);
      const initialCounts = {};
      if (res.reconciliation?.details) {
        Object.entries(res.reconciliation.details).forEach(([method, data]) => {
          initialCounts[method] = data.actual;
        });
        setReconNotes(res.reconciliation.notes || "");
      } else {
        setActualCounts({});
        setReconNotes("");
      }
      setActualCounts(initialCounts);
    } catch (e) {
      console.error(e);
      error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [date, error]);

  const loadReconHistory = useCallback(async () => {
    try {
      const res = await api.get("/analytics/reconciliation-list");
      setReconHistory(res);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (date) {
      loadReport();
      loadReconHistory();
    }
  }, [date, loadReport, loadReconHistory]);

  const handleActualChange = (method, value) => {
    setActualCounts((prev) => ({ ...prev, [method]: value }));
  };

  const confirmSubmission = async () => {
    setIsConfirmOpen(false);
    setSubmittingRecon(true);
    try {
      const details = {};
      Object.entries(report.paymentMethods).forEach(([method, data]) => {
        if (data.count > 0 || actualCounts[method]) {
          details[method] = {
            system: data.amount,
            actual: parseInt(actualCounts[method]) || 0,
          };
        }
      });
      const user = getAuth();
      await api.post("/analytics/reconciliation", {
        date,
        details,
        notes: reconNotes,
        submitted_by: user ? user.username || user.name || "Admin" : "Admin",
      });
      success("Daily reconciliation report submitted successfully.");
      loadReport();
      loadReconHistory();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || e.message || "Failed to submit reconciliation";
      error(msg);
    } finally {
      setSubmittingRecon(false);
    }
  };

  return (
    <>
      <style>{`
        /* ── Win2000 Global ── */
        .win2k-root {
          font-family: "Tahoma", "MS Sans Serif", Arial, sans-serif;
          font-size: 11px;
          color: #000;
          background: #d4d0c8;
          min-height: 100%;
          padding: 8px;
        }

        /* ── Window Chrome ── */
        .win2k-window {
          border: 2px solid;
          border-color: #fff #808080 #808080 #fff;
          background: #d4d0c8;
          box-shadow: 1px 1px 0 #000;
          margin-bottom: 8px;
        }
        .win2k-titlebar {
          background: linear-gradient(to right, #0a246a, #a6caf0);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 3px 4px;
          user-select: none;
        }
        .win2k-titlebar-left {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #fff;
          font-weight: bold;
          font-size: 11px;
        }
        .win2k-titlebar-icon { color: #fff; flex-shrink: 0; }
        .win2k-titlebar-btns { display: flex; gap: 2px; }
        .win2k-titlebtn {
          width: 16px; height: 14px;
          font-size: 9px; line-height: 1;
          border: 2px solid;
          border-color: #fff #808080 #808080 #fff;
          background: #d4d0c8;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          padding: 0; color: #000;
        }
        .win2k-titlebtn:active {
          border-color: #808080 #fff #fff #808080;
        }
        .win2k-titlebtn-close:hover { background: #c0392b; color: #fff; }
        .win2k-window-body { padding: 8px; }

        /* ── Toolbar ── */
        .win2k-toolbar {
          background: #d4d0c8;
          border-bottom: 1px solid #808080;
          padding: 4px 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .win2k-toolbar-sep {
          width: 1px; height: 20px;
          background: #808080;
          margin: 0 3px;
        }
        .win2k-toolbar-label {
          font-size: 11px; color: #000;
        }

        /* ── Buttons ── */
        .win2k-btn {
          border: 2px solid;
          border-color: #fff #808080 #808080 #fff;
          background: #d4d0c8;
          padding: 3px 10px;
          font-family: "Tahoma", Arial, sans-serif;
          font-size: 11px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-width: 75px;
          justify-content: center;
          color: #000;
          box-shadow: 1px 1px 0 #000;
        }
        .win2k-btn:hover { background: #e8e4da; }
        .win2k-btn:active {
          border-color: #808080 #fff #fff #808080;
          padding: 4px 9px 2px 11px;
        }
        .win2k-btn-primary {
          background: #d4d0c8;
          border-color: #fff #808080 #808080 #fff;
        }
        .win2k-btn-disabled {
          color: #808080; cursor: not-allowed;
        }

        /* ── Input ── */
        .win2k-input {
          border: 2px solid;
          border-color: #808080 #fff #fff #808080;
          background: #fff;
          padding: 2px 4px;
          font-family: "Tahoma", Arial, sans-serif;
          font-size: 11px;
          color: #000;
          outline: none;
        }
        .win2k-input:focus {
          outline: 1px dotted #000;
        }
        .win2k-textarea {
          border: 2px solid;
          border-color: #808080 #fff #fff #808080;
          background: #fff;
          padding: 4px;
          font-family: "Tahoma", Arial, sans-serif;
          font-size: 11px;
          color: #000;
          width: 100%;
          resize: vertical;
          outline: none;
          min-height: 72px;
        }
        .win2k-textarea:focus { outline: 1px dotted #000; }

        /* ── Table ── */
        .win2k-table-wrap {
          border: 2px solid;
          border-color: #808080 #fff #fff #808080;
          overflow: auto;
        }
        .win2k-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 11px;
        }
        .win2k-table thead tr {
          background: #d4d0c8;
        }
        .win2k-table thead th {
          padding: 3px 8px;
          border-right: 1px solid #808080;
          border-bottom: 2px solid #808080;
          font-weight: bold;
          font-size: 11px;
          white-space: nowrap;
        }
        .win2k-table tbody tr:nth-child(even) { background: #eae8e0; }
        .win2k-table tbody tr:nth-child(odd) { background: #fff; }
        .win2k-table tbody tr:hover { background: #0a246a; color: #fff; }
        .win2k-table tbody tr:hover td { color: #fff; }
        .win2k-table td {
          padding: 3px 8px;
          border-right: 1px solid #d4d0c8;
          border-bottom: 1px solid #d4d0c8;
          font-size: 11px;
        }

        /* ── Stat Boxes ── */
        .win2k-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        @media (max-width: 768px) {
          .win2k-stat-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .win2k-stat-box {
          border: 2px solid;
          border-color: #808080 #fff #fff #808080;
          background: #fff;
          padding: 8px 10px;
        }
        .win2k-stat-label {
          font-size: 10px;
          text-transform: uppercase;
          color: #444;
          margin-bottom: 4px;
          font-weight: bold;
        }
        .win2k-stat-value {
          font-size: 16px;
          font-weight: bold;
          color: #000a6a;
          word-break: break-all;
        }
        .win2k-stat-sub {
          font-size: 10px;
          color: #666;
          margin-top: 2px;
        }

        /* ── Status chip ── */
        .win2k-chip {
          display: inline-block;
          padding: 1px 6px;
          border: 1px solid #808080;
          font-size: 10px;
          font-weight: bold;
          background: #d4d0c8;
        }
        .win2k-chip-ok { background: #c8e6c9; border-color: #388e3c; color: #1b5e20; }
        .win2k-chip-warn { background: #fff9c4; border-color: #f9a825; color: #6d4c00; }
        .win2k-chip-err { background: #ffcdd2; border-color: #c62828; color: #b71c1c; }

        /* ── History pills ── */
        .win2k-date-bar {
          display: flex;
          gap: 3px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }
        .win2k-date-pill {
          border: 2px solid;
          border-color: #fff #808080 #808080 #fff;
          background: #d4d0c8;
          font-size: 10px;
          padding: 2px 8px;
          cursor: pointer;
          font-family: "Tahoma", Arial, sans-serif;
          display: flex; align-items: center; gap: 3px;
        }
        .win2k-date-pill:hover { background: #e8e4da; }
        .win2k-date-pill.active {
          border-color: #808080 #fff #fff #808080;
          background: #0a246a;
          color: #fff;
        }
        .win2k-date-pill-ok { color: #1b5e20; }
        .win2k-date-pill-warn { color: #6d4c00; }

        /* ── Overlay ── */
        .win2k-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          z-index: 9999;
        }
        .win2k-dialog {
          border: 2px solid;
          border-color: #fff #808080 #808080 #fff;
          background: #d4d0c8;
          box-shadow: 3px 3px 0 #000;
          min-width: 320px;
          max-width: 680px;
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
        }
        .win2k-dialog-body { padding: 14px; }

        /* ── Groupbox ── */
        .win2k-groupbox {
          border: 1px solid #808080;
          margin-top: 12px;
          padding: 8px 10px 10px;
          position: relative;
        }
        .win2k-groupbox-title {
          position: absolute;
          top: -8px; left: 8px;
          background: #d4d0c8;
          padding: 0 4px;
          font-size: 11px;
          font-weight: bold;
        }

        /* ── Checklist ── */
        .win2k-checklist { list-style: none; padding: 0; margin: 0; }
        .win2k-checklist li {
          display: flex; align-items: flex-start; gap: 6px;
          padding: 3px 0;
          font-size: 11px;
          border-bottom: 1px dotted #aaa;
        }
        .win2k-checklist li:last-child { border-bottom: none; }
        .win2k-checkmark {
          width: 14px; height: 14px;
          border: 2px solid #808080;
          background: #fff;
          flex-shrink: 0;
          margin-top: 1px;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px;
        }

        /* ── Loading ── */
        .win2k-progress {
          height: 18px;
          border: 2px solid #808080;
          background: #fff;
          overflow: hidden;
          position: relative;
        }
        .win2k-progress-bar {
          height: 100%;
          background: repeating-linear-gradient(
            90deg,
            #0a246a 0px, #0a246a 10px,
            #a6caf0 10px, #a6caf0 14px
          );
          animation: win2k-progress 1.2s linear infinite;
          width: 60%;
        }
        @keyframes win2k-progress {
          from { transform: translateX(-60%); }
          to { transform: translateX(100%); }
        }

        /* Print overrides */
        @media print {
          .win2k-toolbar, .win2k-date-bar, .win2k-print-hide { display: none !important; }
          .win2k-window { box-shadow: none; border: 1px solid #000; }
          .win2k-titlebar { background: #000 !important; }
        }
      `}</style>

      <div className="win2k-root">

        {/* ── Top Menu Bar / Toolbar ── */}
        <div className="win2k-toolbar print:hidden">
          <span className="win2k-toolbar-label font-bold">Cashier Reconciliation</span>
          <div className="win2k-toolbar-sep" />
          <span className="win2k-toolbar-label">Date:</span>
          <Win2kInput
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-36"
          />
          <div className="win2k-toolbar-sep" />
          <Win2kBtn onClick={loadReport}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </Win2kBtn>
          <Win2kBtn onClick={() => window.print()}>
            <Printer size={12} />
            Print
          </Win2kBtn>
        </div>

        {/* ── Quick date pills ── */}
        {(Array.isArray(reconHistory) ? reconHistory : []).length > 0 && (
          <div className="win2k-date-bar print:hidden">
            {reconHistory.map((r) => {
              const isOk = r?.status === "SUBMITTED";
              const rDate = r?.date ? new Date(r.date).toISOString().split("T")[0] : "";
              const isCurrent = rDate === date;
              return (
                <button
                  key={r.id}
                  onClick={() => setDate(rDate)}
                  className={cn(
                    "win2k-date-pill",
                    isCurrent && "active",
                    !isCurrent && (isOk ? "win2k-date-pill-ok" : "win2k-date-pill-warn")
                  )}
                >
                  {isOk ? "✔" : "!"}
                  {new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </button>
              );
            })}
          </div>
        )}

        {/* ── Loading ── */}
        {loading ? (
          <Win2kWindow title="Loading..." icon={RefreshCw}>
            <p style={{ marginBottom: 6 }}>Please wait while the report is compiled...</p>
            <div className="win2k-progress"><div className="win2k-progress-bar" /></div>
          </Win2kWindow>
        ) : !report ? (
          <Win2kWindow title="No Data" icon={Calendar}>
            <div style={{ padding: "20px", textAlign: "center" }}>
              <Calendar size={32} style={{ margin: "0 auto 8px", color: "#808080" }} />
              <p style={{ fontWeight: "bold" }}>No records found</p>
              <p style={{ color: "#666", marginTop: 4 }}>
                There is no sales data for {new Date(date).toLocaleDateString()}.
              </p>
            </div>
          </Win2kWindow>
        ) : (
          <>
            {/* ── Summary Stats ── */}
            <Win2kWindow title={`Daily Report — ${new Date(date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`} icon={BarChart2}>
              <div className="win2k-stat-grid">
                <Win2kSummaryCard
                  label="Gross Sales"
                  value={formatIDR(report.summary.grossSales)}
                  sub={`${report.summary.totalOrders} transactions`}
                />
                <Win2kSummaryCard
                  label="Net Revenue"
                  value={formatIDR(report.summary.netSales)}
                  sub="After discounts"
                />
                <Win2kSummaryCard
                  label="Expected Cash"
                  value={formatIDR(report.cashInDrawer)}
                  sub="Drawer target"
                />
                <Win2kSummaryCard
                  label="Final Revenue"
                  value={formatIDR(report.summary.finalRevenue)}
                  sub="Net – commission"
                />
              </div>
            </Win2kWindow>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "start" }}>
              <div>
                {/* ── Payment Reconciliation ── */}
                <Win2kWindow title="Payment Reconciliation — System vs. Actual" icon={Wallet}>
                  <Win2kTable
                    headers={[
                      { label: "Payment Method" },
                      { label: "Count", right: true },
                      { label: "System Total", right: true },
                      { label: "Actual Count (Rp)", right: true },
                      { label: "Difference", right: true },
                    ]}
                  >
                    {Object.entries(report.paymentMethods || {})
                      .filter(([method, data]) => data.count > 0 || actualCounts[method])
                      .map(([method, data]) => {
                        const actual = parseInt(actualCounts[method]) || 0;
                        const diff = actual - data.amount;
                        return (
                          <tr key={method}>
                            <td><strong>{method}</strong></td>
                            <td style={{ textAlign: "right" }}>{data.count}</td>
                            <td style={{ textAlign: "right" }}>{formatIDR(data.amount)}</td>
                            <td style={{ textAlign: "right" }} className="win2k-print-hide">
                              <Win2kInput
                                type="number"
                                value={actualCounts[method] || ""}
                                onChange={(e) => handleActualChange(method, e.target.value)}
                                placeholder="0"
                                className="w-28 text-right"
                              />
                            </td>
                            <td
                              style={{
                                textAlign: "right",
                                fontWeight: "bold",
                                color: diff === 0 ? "#1b5e20" : "#b71c1c",
                              }}
                            >
                              {diff > 0 ? "+" : ""}
                              {formatIDR(diff)}
                            </td>
                          </tr>
                        );
                      })}
                  </Win2kTable>
                </Win2kWindow>

                {/* ── Shift Records ── */}
                <Win2kWindow title="Closed Shift Records — Cashier Logs" icon={Clock}>
                  <Win2kTable
                    headers={[
                      { label: "Cashier" },
                      { label: "Timeline" },
                      { label: "Sales", right: true },
                      { label: "Discrepancy", right: true },
                      { label: "Action", right: true },
                    ]}
                  >
                    {!(report.shifts?.length > 0) ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "#808080", fontStyle: "italic" }}>
                          No closed shifts recorded
                        </td>
                      </tr>
                    ) : (
                      report.shifts.map((s) => (
                        <tr key={s.id}>
                          <td><strong>{s.user?.name || s.user?.username || "Unknown"}</strong></td>
                          <td>
                            {new Date(s.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {s.end_time
                              ? new Date(s.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "Active"}
                          </td>
                          <td style={{ textAlign: "right" }}>{formatIDR(s.total_sales || 0)}</td>
                          <td
                            style={{
                              textAlign: "right",
                              fontWeight: "bold",
                              color: (s.discrepancy || 0) === 0 ? "#1b5e20" : "#b71c1c",
                            }}
                          >
                            {s.discrepancy > 0 ? "+" : ""}
                            {formatIDR(s.discrepancy || 0)}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Win2kBtn
                              onClick={() =>
                                setSelectedRecon({
                                  ...s.reconciliation_data,
                                  date: s.end_time,
                                  submitted_by: s.user?.name || s.user?.username,
                                  total_system: s.expected_cash,
                                  total_actual: s.ending_cash,
                                  discrepancy: s.discrepancy,
                                  notes: s.note,
                                  updated_at: s.end_time,
                                })
                              }
                            >
                              Review
                            </Win2kBtn>
                          </td>
                        </tr>
                      ))
                    )}
                  </Win2kTable>
                </Win2kWindow>

                {/* ── Notes & Submit ── */}
                <Win2kWindow title="End of Day Notes & Submission" icon={Save} className="win2k-print-hide">
                  <label style={{ fontWeight: "bold", display: "block", marginBottom: 4 }}>
                    Shift Notes / Discrepancy Remarks:
                  </label>
                  <textarea
                    className="win2k-textarea"
                    rows={4}
                    placeholder="Enter notes about discrepancies, special orders, or handover remarks..."
                    value={reconNotes}
                    onChange={(e) => setReconNotes(e.target.value)}
                  />
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                    <Win2kBtn
                      onClick={() => setIsConfirmOpen(true)}
                      disabled={submittingRecon}
                      variant="primary"
                    >
                      {submittingRecon ? (
                        <RefreshCw size={11} className="animate-spin" />
                      ) : (
                        <Save size={11} />
                      )}
                      {submittingRecon ? "Submitting..." : "Submit Reconciled Report"}
                    </Win2kBtn>
                  </div>
                </Win2kWindow>
              </div>

              {/* ── Right column ── */}
              <div style={{ minWidth: 220 }}>
                {/* Channel Split */}
                <Win2kWindow title="Channel Split" icon={Activity}>
                  <Win2kTable
                    headers={[
                      { label: "Source" },
                      { label: "Vol", right: true },
                      { label: "Revenue", right: true },
                    ]}
                  >
                    {Object.keys(report.platforms || {}).map((p) => (
                      <tr key={p}>
                        <td><strong>{p}</strong></td>
                        <td style={{ textAlign: "right" }}>{report.platforms[p].count}</td>
                        <td style={{ textAlign: "right" }}>{formatIDR(report.platforms[p].amount)}</td>
                      </tr>
                    ))}
                  </Win2kTable>
                </Win2kWindow>

                {/* Closing Checklist */}
                <Win2kWindow title="Closing Checklist" icon={CheckCircle} className="win2k-print-hide">
                  <ul className="win2k-checklist">
                    {[
                      "Confirm physical cash in drawer matches actual count.",
                      "Validate EDC settlements against system payment totals.",
                      "Review reasons for every discrepancy > 0.",
                      "Submit report to lock today's performance data.",
                    ].map((text, i) => (
                      <li key={i}>
                        <div className="win2k-checkmark">✔</div>
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </Win2kWindow>
              </div>
            </div>

            {/* ── Submission History ── */}
            <Win2kWindow title="Submission History — Reconciliation Archive" icon={DollarSign} className="win2k-print-hide">
              <Win2kTable
                headers={[
                  { label: "Business Date" },
                  { label: "System Target", right: true },
                  { label: "Actual Logged", right: true },
                  { label: "Gap", right: true },
                  { label: "Status" },
                  { label: "Action", right: true },
                ]}
              >
                {!(reconHistory?.length > 0) ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "#808080", fontStyle: "italic" }}>
                      Empty Archive
                    </td>
                  </tr>
                ) : (
                  reconHistory.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>
                          {new Date(r.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </strong>
                      </td>
                      <td style={{ textAlign: "right" }}>{formatIDR(r.total_system)}</td>
                      <td style={{ textAlign: "right" }}>{formatIDR(r.total_actual)}</td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: "bold",
                          color: r.discrepancy === 0 ? "#1b5e20" : "#b71c1c",
                        }}
                      >
                        {r.discrepancy > 0 ? "+" : ""}
                        {formatIDR(r.discrepancy)}
                      </td>
                      <td>
                        <span className={`win2k-chip ${r.status === "SUBMITTED" ? "win2k-chip-ok" : "win2k-chip-warn"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Win2kBtn onClick={() => setSelectedRecon(r)}>Details</Win2kBtn>
                      </td>
                    </tr>
                  ))
                )}
              </Win2kTable>
            </Win2kWindow>
          </>
        )}

        {/* ── Confirm Submit Modal ── */}
        <Win2kModal
          open={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          title="Confirm Submission"
        >
          <p style={{ marginBottom: 12 }}>
            Are you sure you want to finalize the reconciliation for:<br />
            <strong style={{ display: "block", marginTop: 6 }}>
              {date ? new Date(date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}
            </strong>
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Win2kBtn onClick={confirmSubmission} variant="primary">
              <Save size={11} /> Yes, Submit
            </Win2kBtn>
            <Win2kBtn onClick={() => setIsConfirmOpen(false)}>
              <X size={11} /> Cancel
            </Win2kBtn>
          </div>
        </Win2kModal>

        {/* ── Detail Modal ── */}
        <Win2kModal
          open={!!selectedRecon}
          onClose={() => setSelectedRecon(null)}
          title="Archive Record — Reconciliation Details"
        >
          {selectedRecon && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
                <div className="win2k-stat-box">
                  <div className="win2k-stat-label">System Total</div>
                  <div className="win2k-stat-value" style={{ fontSize: 13 }}>{formatIDR(selectedRecon.total_system)}</div>
                </div>
                <div className="win2k-stat-box">
                  <div className="win2k-stat-label">Actual Count</div>
                  <div className="win2k-stat-value" style={{ fontSize: 13, color: "#1b5e20" }}>{formatIDR(selectedRecon.total_actual)}</div>
                </div>
                <div className="win2k-stat-box">
                  <div className="win2k-stat-label">Gap</div>
                  <div
                    className="win2k-stat-value"
                    style={{ fontSize: 13, color: selectedRecon.discrepancy === 0 ? "#1b5e20" : "#b71c1c" }}
                  >
                    {selectedRecon.discrepancy > 0 ? "+" : ""}
                    {formatIDR(selectedRecon.discrepancy)}
                  </div>
                </div>
              </div>

              {selectedRecon.details && (
                <Win2kTable
                  headers={[
                    { label: "Payment Channel" },
                    { label: "Expected", right: true },
                    { label: "Captured", right: true },
                    { label: "Variance", right: true },
                  ]}
                >
                  {Object.entries(selectedRecon.details).map(([method, data]) => {
                    const diff = data.actual - data.system;
                    return (
                      <tr key={method}>
                        <td><strong>{method}</strong></td>
                        <td style={{ textAlign: "right" }}>{formatIDR(data.system)}</td>
                        <td style={{ textAlign: "right" }}>{formatIDR(data.actual)}</td>
                        <td style={{ textAlign: "right", fontWeight: "bold", color: diff === 0 ? "#1b5e20" : "#b71c1c" }}>
                          {diff > 0 ? "+" : ""}{formatIDR(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </Win2kTable>
              )}

              {selectedRecon.notes && (
                <div
                  style={{
                    border: "2px solid",
                    borderColor: "#808080 #fff #fff #808080",
                    background: "#fff",
                    padding: "8px",
                    marginTop: 10,
                  }}
                >
                  <strong style={{ display: "block", marginBottom: 4, fontSize: 10, textTransform: "uppercase" }}>
                    Submission Notes:
                  </strong>
                  <p style={{ color: "#333", fontStyle: "italic" }}>{selectedRecon.notes}</p>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: "1px solid #808080",
                }}
              >
                <span style={{ fontSize: 10 }}>
                  Submitted by: <strong>{selectedRecon.submitted_by || "System"}</strong>
                  {" · "}
                  {selectedRecon.updated_at ? new Date(selectedRecon.updated_at).toLocaleString() : ""}
                </span>
                <Win2kBtn onClick={() => setSelectedRecon(null)}>
                  <X size={11} /> Close
                </Win2kBtn>
              </div>
            </>
          )}
        </Win2kModal>
      </div>
    </>
  );
}
