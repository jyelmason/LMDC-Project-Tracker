import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from "firebase/firestore";

// ── PASTE YOUR FIREBASE CONFIG HERE ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const TRADES = ["Electrical", "HVAC", "Architectural", "Controls", "Plumbing"];
const PROGRESS_OPTIONS = ["Not Started", "In Progress", "On Hold", "Complete"];

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
    <span style={{ background: bg, color, fontSize: "0.72rem", fontWeight: 600, padding: "3px 10px", borderRadius: "99px" }}>
      {value || "—"}
    </span>
  );
}

// ── IMPORT PAGE ───────────────────────────────────────────────────────────────
function ImportPage() {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState("");

  async function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const text = await file.text();
      const records = JSON.parse(text);
      const entries = Object.entries(records);
      setProgress({ done: 0, total: entries.length });

      // Write in batches to avoid overwhelming Firestore
      const CHUNK = 50;
      for (let i = 0; i < entries.length; i += CHUNK) {
        const chunk = entries.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(([id, data]) => setDoc(doc(db, "tracker", id), data))
        );
        setProgress({ done: Math.min(i + CHUNK, entries.length), total: entries.length });
      }
      setStatus("done");
    } catch (err) {
      setErrorMsg(err.message || "Import failed.");
      setStatus("error");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'Inter', system-ui, sans-serif", color: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#1E293B", border: "1px solid #334155", borderRadius: 16, padding: 40, maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#F8FAFC", marginBottom: 8 }}>One-Time Data Import</div>
        <div style={{ color: "#64748B", fontSize: "0.875rem", marginBottom: 32 }}>
          Upload your <code style={{ background: "#0F172A", padding: "2px 6px", borderRadius: 4, color: "#94A3B8" }}>firebase_import.json</code> file to seed the database. Do this once, then use the main app.
        </div>

        {status === "idle" && (
          <label style={{
            display: "inline-block", padding: "12px 28px", borderRadius: 10,
            background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white",
            fontWeight: 600, cursor: "pointer", fontSize: "0.9rem",
          }}>
            Select JSON File
            <input type="file" accept=".json" onChange={handleFile} style={{ display: "none" }} />
          </label>
        )}

        {status === "loading" && (
          <div>
            <div style={{ color: "#94A3B8", marginBottom: 16 }}>
              Importing… {progress.done} / {progress.total} records
            </div>
            <div style={{ background: "#0F172A", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 99,
                background: "linear-gradient(90deg,#2563EB,#7C3AED)",
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                transition: "width 0.3s",
              }} />
            </div>
          </div>
        )}

        {status === "done" && (
          <div>
            <div style={{ color: "#4ADE80", fontSize: "1.1rem", fontWeight: 600, marginBottom: 12 }}>
              ✓ {progress.total} records imported successfully
            </div>
            <div style={{ color: "#64748B", fontSize: "0.82rem" }}>
              You can now close this page and share the main URL with contractors:<br />
              <strong style={{ color: "#94A3B8" }}>yoursite.vercel.app</strong> (without <code>/import</code>)
            </div>
          </div>
        )}

        {status === "error" && (
          <div>
            <div style={{ color: "#F87171", marginBottom: 12 }}>Import failed: {errorMsg}</div>
            <button onClick={() => setStatus("idle")} style={{
              background: "#334155", border: "none", color: "#E2E8F0",
              borderRadius: 8, padding: "8px 20px", cursor: "pointer",
            }}>Try again</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const isImportPage = window.location.pathname === "/import";
  if (isImportPage) return <ImportPage />;

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
    setForm({ dateUpdated: item.dateUpdated || "", progress: item.progress || "", user: item.user || "" });
    setSaved(false);
    setError("");
  }

  async function handleSave() {
    if (!form.user.trim()) { setError("Name / company is required."); return; }
    setSaving(true);
    setError("");
    try {
      const ref = doc(db, "tracker", selected.id);
      await updateDoc(ref, { dateUpdated: form.dateUpdated, progress: form.progress, user: form.user });
      setItems(prev => prev.map(i => i.id === selected.id ? { ...i, ...form } : i));
      setSelected(prev => ({ ...prev, ...form }));
      setSaved(true);
    } catch {
      setError("Save failed. Please try again.");
    }
    setSaving(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'Inter', system-ui, sans-serif", color: "#E2E8F0" }}>
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
                }}
                  onMouseOver={e => { e.target.style.background = "#2563EB"; e.target.style.borderColor = "#3B82F6"; }}
                  onMouseOut={e => { e.target.style.background = "#1E293B"; e.target.style.borderColor = "#334155"; }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
              <button onClick={() => setTrade("")} style={{
                background: "none", border: "1px solid #334155", color: "#94A3B8",
                borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6,
              }}>
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
                All trades
              </button>
              <Badge trade={trade} />
              <span style={{ color: "#475569", fontSize: "0.85rem" }}>{items.length} items</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 420px" : "1fr", gap: 20 }}>
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
                  <div style={{ background: "#1E293B", borderRadius: 12, overflow: "hidden" }}>
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
                            style={{ borderBottom: "1px solid #0F172A", cursor: "pointer", background: selected?.id === item.id ? "#1E3A5F" : "transparent", transition: "background 0.1s" }}
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

              {selected && (
                <div style={{ background: "#1E293B", borderRadius: 12, border: "1px solid #334155", padding: 24, height: "fit-content", position: "sticky", top: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#3B82F6", marginBottom: 4 }}>{selected.uniqueId}</div>
                      <div style={{ fontWeight: 600, color: "#F1F5F9", fontSize: "0.95rem", lineHeight: 1.3 }}>{selected.item}</div>
                    </div>
                    <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 4 }}>
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

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
                    <select value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))}
                      style={{ width: "100%", marginBottom: 14, background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#E2E8F0", fontSize: "0.875rem", outline: "none" }}>
                      <option value="">Select status…</option>
                      {PROGRESS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>

                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94A3B8", marginBottom: 4 }}>Date Updated</label>
                    <input type="date" value={form.dateUpdated} onChange={e => setForm(f => ({ ...f, dateUpdated: e.target.value }))}
                      style={{ width: "100%", boxSizing: "border-box", marginBottom: 14, background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#E2E8F0", fontSize: "0.875rem", outline: "none" }} />

                    <label style={{ display: "block", fontSize: "0.78rem", color: "#94A3B8", marginBottom: 4 }}>Your Name / Company <span style={{ color: "#EF4444" }}>*</span></label>
                    <input placeholder="e.g. J. Smith – ABC Electric" value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))}
                      style={{ width: "100%", boxSizing: "border-box", marginBottom: 16, background: "#0F172A", border: "1px solid #334155", borderRadius: 8, padding: "9px 12px", color: "#E2E8F0", fontSize: "0.875rem", outline: "none" }} />

                    {error && <div style={{ color: "#F87171", fontSize: "0.8rem", marginBottom: 12 }}>{error}</div>}
                    {saved && <div style={{ color: "#4ADE80", fontSize: "0.8rem", marginBottom: 12 }}>✓ Saved successfully</div>}

                    <button onClick={handleSave} disabled={saving} style={{
                      width: "100%", padding: "10px", borderRadius: 8,
                      background: saving ? "#1E40AF" : "linear-gradient(135deg,#2563EB,#7C3AED)",
                      border: "none", color: "white", fontWeight: 600, fontSize: "0.875rem",
                      cursor: saving ? "not-allowed" : "pointer",
                    }}>
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
