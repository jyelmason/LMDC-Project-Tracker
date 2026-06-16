import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";

// ── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBxzdPgV6GeV5lFDCTlYHYNW402y9-0TCQ",
  authDomain: "lmdc-project-tracker.firebaseapp.com",
  projectId: "lmdc-project-tracker",
  storageBucket: "lmdc-project-tracker.firebasestorage.app",
  messagingSenderId: "921100904090",
  appId: "1:921100904090:web:cfe5a5f7491c8b0c80a123",
  measurementId: "G-K3ZVCDKJ9G"
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TRADES = ["Electrical", "HVAC", "Architectural", "Controls", "Plumbing"];

const PROGRESS_OPTIONS = [
  "Not Started",
  "In Progress",
  "On Hold",
  "Complete",
];

function Badge({ trade }) {
  const colors = {
    Electrical: "#FEF3C7 #92400E",
    HVAC: "#DBEAFE #1E40AF",
    Architectural: "#F3E8FF #6B21A8",
    Controls: "#DCFCE7 #166534",
    Plumbing: "#FEE2E2 #991B1B",
  };
  const [bg, text] = (colors[trade] || "#F1F5F9 #475569").split(" ");
  return (
    <span style={{
      background: bg, color: text,
      fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em",
      padding: "2px 8px", borderRadius: "99px", textTransform: "uppercase",
    }}>
      {trade}
    </span>
  );
}

function ProgressPill({ value }) {
  const colors = {
    "Not Started": "#F1F5F9 #64748B",
    "In Progress": "#FEF9C3 #A16207",
    "On Hold": "#FEE2E2 #991B1B",
    "Complete": "#DCFCE7 #166534",
  };
  const [bg, color] = (colors[value] || "#F1F5F9 #64748B").split(" ");
  return (
    <span style={{
      background: bg, color,
      fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px",
      borderRadius: "99px",
    }}>
      {value || "—"}
    </span>
  );
}

export default function App() {
  const [trade, setTrade] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ dateUpdated: "", progress: "", user: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!trade) return;
    setLoading(true);
    setItems([]);
    setSelected(null);
    setSearch("");
    const q = query(collection(db, "tracker"), where("trade", "==", trade));
    getDocs(q).then(snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }).catch(() => {
      setError("Failed to load items. Check your Firebase config.");
      setLoading(false);
    });
  }, [trade]);

  const filtered = items.filter(i =>
    !search || i.item?.toLowerCase().includes(search.toLowerCase()) ||
    i.uniqueId?.toLowerCase().includes(search.toLowerCase())
  );

  function openItem(item) {
    setSelected(item);
    setForm({
      dateUpdated: item.dateUpdated || "",
      progress: item.progress || "",
      user: item.user || "",
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!form.user.trim()) { setError("Name / company is required."); return; }
    setSaving(true);
    setError("");
    try {
      const ref = doc(db, "tracker", selected.id);
      await updateDoc(ref, {
        dateUpdated: form.dateUpdated,
        progress: form.progress,
        user: form.user,
      });
      setItems(prev => prev.map(i =>
        i.id === selected.id ? { ...i, ...form } : i
      ));
      setSelected(prev => ({ ...prev, ...form }));
      setSaved(true);
    } catch {
      setError("Save failed. Please try again.");
    }
    setSaving(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'Inter', system-ui, sans-serif", color: "#E2E8F0" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1E293B", padding: "20px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#3B82F6,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "#F8FAFC" }}>Project Tracker</div>
          <div style={{ fontSize: "0.72rem", color: "#64748B" }}>Contractor Submission Portal</div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Trade selector */}
        {!trade ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#F8FAFC", marginBottom: 8 }}>Select your trade</div>
            <div style={{ color: "#64748B", marginBottom: 40 }}>Choose your trade to view and update your assigned items.</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
              {TRADES.map(t => (
                <button key={t} onClick={() => setTrade(t)} style={{
                  background: "#1E293B", border: "1px solid #334155", color: "#E2E8F0",
                  borderRadius: 12, padding: "18px 32px", fontSize: "1rem", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                }} onMouseOver={e => { e.target.style.background="#2563EB"; e.target.style.borderColor="#3B82F6"; }}
                   onMouseOut={e => { e.target.style.background="#1E293B"; e.target.style.borderColor="#334155"; }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {/* Trade header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={() => setTrade("")} style={{
                background: "none", border: "1px solid #334155", color: "#94A3B8",
                borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6
              }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
                All trades
              </button>
              <Badge trade={trade} />
              <span style={{ color: "#475569", fontSize: "0.85rem" }}>{items.length} items</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 20 }}>
              {/* Table */}
              <div>
                <input
                  placeholder="Search by item name or ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box", marginBottom: 16,
                    background: "#1E293B", border: "1px solid #334155", borderRadius: 10,
                    padding: "10px 16px", color: "#E2E8F0", fontSize: "0.875rem", outline: "none",
                  }}
                />
                {loading ? (
                  <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>Loading items…</div>
                ) : (
                  <div style={{ background: "#1E293B", borderRadius: 12, border: "1px solid #1E293B", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid #334155" }}>
                          {["ID", "Equipment / Item", "Type", "Progress", "Last Updated"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748B", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 ? (
                          <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#475569" }}>No items found.</td></tr>
                        ) : filtered.map(item => (
                          <tr key={item.id}
                            onClick={() => openItem(item)}
                            style={{
                              borderBottom: "1px solid #0F172A", cursor: "pointer",
                              background: selected?.id === item.id ? "#1E3A5F" : "transparent",
                              transition: "background 0.1s",
                            }}
                            onMouseOver={e => { if (selected?.id !== item.id) e.currentTarget.style.background = "#1E2D40"; }}
                            onMouseOut={e => { if (selected?.id !== item.id) e.currentTarget.style.background = "transparent"; }}
                          >
                            <td style={{ padding: "10px 14px", color: "#64748B", fontFamily: "monospace", fontSize: "0.78rem" }}>{item.uniqueId}</td>
                            <td style={{ padding: "10px 14px", color: "#CBD5E1", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.item}</td>
                            <td style={{ padding: "10px 14px", color: "#94A3B8" }}>{item.type || "—"}</td>
                            <td style={{ padding: "10px 14px" }}><ProgressPill value={item.progress} /></td>
                            <td style={{ padding: "10px 14px", color: "#64748B" }}>{item.dateUpdated || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Edit panel */}
              {selected && (
                <div style={{ background: "#1E293B", borderRadius: 12, border: "1px solid #334155", padding: 24, height: "fit-content", position: "sticky", top: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#3B82F6", marginBottom: 4 }}>{selected.uniqueId}</div>
                      <div style={{ fontWeight: 600, color: "#F1F5F9", fontSize: "0.95rem", lineHeight: 1.3 }}>{selected.item}</div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 4 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>

                  {/* Read-only info */}
                  <div style={{ background: "#0F172A", borderRadius: 8, padding: 14, marginBottom: 20 }}>
                    {[
                      ["Type", selected.type],
                      ["Model Number", selected.modelNumber],
                      ["Equipment Served", selected.equipmentServed],
                      ["Location", selected.location],
                      ["Quantity", selected.quantity],
                    ].map(([label, value]) => value ? (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.8rem" }}>
                        <span style={{ color: "#475569" }}>{label}</span>
                        <span style={{ color: "#94A3B8", maxWidth: 180, textAlign: "right" }}>{value}</span>
                      </div>
                    ) : null)}
                  </div>

                  <div style={{ borderTop: "1px solid #334155", paddingTop: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#3B82F6", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>Your Submission</div>

                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94A3B8", marginBottom: 4 }}>Progress</label>
                    <select
                      value={form.progress}
                      onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
                      style={{
                        width: "100%", marginBottom: 14, background: "#0F172A",
                        border: "1px solid #334155", borderRadius: 8, padding: "9px 12px",
                        color: "#E2E8F0", fontSize: "0.875rem", outline: "none",
                      }}
                    >
                      <option value="">Select status…</option>
                      {PROGRESS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>

                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94A3B8", marginBottom: 4 }}>Date Updated</label>
                    <input
                      type="date"
                      value={form.dateUpdated}
                      onChange={e => setForm(f => ({ ...f, dateUpdated: e.target.value }))}
                      style={{
                        width: "100%", boxSizing: "border-box", marginBottom: 14,
                        background: "#0F172A", border: "1px solid #334155", borderRadius: 8,
                        padding: "9px 12px", color: "#E2E8F0", fontSize: "0.875rem", outline: "none",
                      }}
                    />

                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94A3B8", marginBottom: 4 }}>Your Name / Company <span style={{ color: "#EF4444" }}>*</span></label>
                    <input
                      placeholder="e.g. J. Smith – ABC Electric"
                      value={form.user}
                      onChange={e => setForm(f => ({ ...f, user: e.target.value }))}
                      style={{
                        width: "100%", boxSizing: "border-box", marginBottom: 16,
                        background: "#0F172A", border: "1px solid #334155", borderRadius: 8,
                        padding: "9px 12px", color: "#E2E8F0", fontSize: "0.875rem", outline: "none",
                      }}
                    />

                    {error && <div style={{ color: "#F87171", fontSize: "0.8rem", marginBottom: 12 }}>{error}</div>}
                    {saved && <div style={{ color: "#4ADE80", fontSize: "0.8rem", marginBottom: 12 }}>✓ Saved successfully</div>}

                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 8,
                        background: saving ? "#1E40AF" : "linear-gradient(135deg,#2563EB,#7C3AED)",
                        border: "none", color: "white", fontWeight: 600, fontSize: "0.875rem",
                        cursor: saving ? "not-allowed" : "pointer",
                      }}
                    >
                      {saving ? "Saving…" : "Save Submission"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
