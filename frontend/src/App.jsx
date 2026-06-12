import { useState, useEffect } from "react";
const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
async function apiFetch(path, opts = {}) {
  const isForm = opts.body instanceof FormData;
  const res = await fetch(`${API}${path}`, {
    headers: { ...(!isForm ? { "Content-Type": "application/json" } : {}), ...opts.headers }, ...opts
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error("Invalid server response (not JSON)");
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700;800&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#080d14;--sidebar:#0a1020;--panel:#0d1526;--card:#0f1a2e;--border:rgba(0,180,255,0.15);--border2:rgba(0,180,255,0.07);--cyan:#00b4ff;--green:#00ff88;--red:#ff3355;--orange:#ff8c00;--yellow:#ffd700;--text:#c8d8e8;--muted:#4a6080;--bright:#e8f4ff}
  body{background:var(--bg);color:var(--text);font-family:'Exo 2',sans-serif;min-height:100vh;overflow-x:hidden}
  button,input{font-family:inherit}
  ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:rgba(0,180,255,.3);border-radius:2px}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes scan{0%{transform:translateY(-100%)}100%{transform:translateY(500%)}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes glow{0%,100%{box-shadow:0 0 8px rgba(0,180,255,.3)}50%{box-shadow:0 0 20px rgba(0,180,255,.7)}}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
  .fade{animation:fadeIn .35s ease}
  .blink{animation:blink 1s step-end infinite}
  .nav-item{display:flex;align-items:center;gap:.75rem;padding:.65rem 1.2rem;border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);transition:all .2s;border:none;background:transparent;width:100%;text-align:left}
  .nav-item:hover{color:var(--cyan);background:rgba(0,180,255,.06)}
  .nav-item.active{color:var(--cyan);background:rgba(0,180,255,.12);border-left:2px solid var(--cyan)}
  .panel{background:var(--panel);border:1px solid var(--border);border-radius:10px;position:relative;overflow:hidden}
  .panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--cyan),transparent);opacity:.4}
  .ptitle{font-family:'Rajdhani',sans-serif;font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--cyan);padding:.75rem 1rem .5rem;border-bottom:1px solid var(--border2);display:flex;justify-content:space-between;align-items:center}
  .btn{background:linear-gradient(135deg,rgba(0,180,255,.2),rgba(0,212,255,.1));border:1px solid rgba(0,180,255,.4);color:var(--cyan);padding:.55rem 1.2rem;border-radius:6px;font-size:.8rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:.4rem}
  .btn:hover{background:rgba(0,180,255,.25);box-shadow:0 0 15px rgba(0,180,255,.3)}
  .btn:disabled{opacity:.4;cursor:not-allowed}
  .btng{background:transparent;border:1px solid rgba(255,255,255,.1);color:var(--muted);padding:.5rem 1rem;border-radius:6px;font-size:.75rem;font-weight:600;text-transform:uppercase;cursor:pointer;transition:all .2s}
  .btng:hover{border-color:rgba(0,180,255,.3);color:var(--cyan)}
  .frow{display:flex;justify-content:space-between;align-items:center;padding:.4rem 0;border-bottom:1px solid var(--border2);font-size:.75rem}
  .frow:last-child{border-bottom:none}
  .grid-bg{background-image:linear-gradient(rgba(0,180,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,255,.03) 1px,transparent 1px);background-size:32px 32px}
  input[type=text]{background:rgba(0,0,0,.3);border:1px solid var(--border);color:var(--text);padding:.5rem .8rem;border-radius:6px;font-size:.78rem;width:100%;outline:none;font-family:'Share Tech Mono',monospace}
  input[type=text]::placeholder{color:var(--muted)}
`;
const SVGS = {
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  upload: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>,
  history: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="12 8 12 12 14 14" /><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5" /></svg>,
  dash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>,
  video: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
  audio: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>,
  check: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>,
  trash: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>,
  code: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
  cog: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>,
  admin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  logout: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
};
const RISK = { Critical: { c: "#ff3355", bg: "rgba(255,51,85,.12)", b: "rgba(255,51,85,.3)", l: "CRITICAL RISK" }, High: { c: "#ff8c00", bg: "rgba(255,140,0,.12)", b: "rgba(255,140,0,.3)", l: "HIGH RISK" }, Medium: { c: "#ffd700", bg: "rgba(255,215,0,.12)", b: "rgba(255,215,0,.3)", l: "MEDIUM RISK" }, Low: { c: "#00ff88", bg: "rgba(0,255,136,.12)", b: "rgba(0,255,136,.3)", l: "AUTHENTIC / LOW RISK" } };

function Gauge({ value, color }) {
  const r = 52, cx = 65, cy = 70, circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ * 0.75;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width="130" height="105" viewBox="0 0 130 105">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,180,255,.1)" strokeWidth="8" strokeDasharray={`${circ * .75} ${circ * .25}`} strokeDashoffset={circ * .125} transform={`rotate(-225 ${cx} ${cy})`} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color || "#ff3355"} strokeWidth="8" strokeDasharray={`${dash} ${circ - dash + circ * .25}`} strokeDashoffset={circ * .125} transform={`rotate(-225 ${cx} ${cy})`} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color || "#ff3355"})`, transition: "stroke-dasharray 1s ease" }} />
        <text x={cx} y={cy + 8} textAnchor="middle" fill={color || "#ff3355"} style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "22px", fontWeight: 700 }}>{value.toFixed(2)}</text>
      </svg>
      <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".1em", marginTop: "-.4rem" }}>DEEPFAKE PROBABILITY</div>
    </div>
  );
}

function Pipeline({ stage }) {
  const steps = [{ id: 1, s: "FILE VALIDATION" }, { id: 2, s: "MEDIA INGESTION" }, { id: 3, s: "FACE DETECTION" }, { id: 4, s: "DEEPFAKE SCAN" }, { id: 5, s: "RESULTS & REPORT" }];
  const st = id => stage === 0 ? "idle" : id < stage ? "done" : id === stage ? "active" : "wait";
  const sc = s => s === "done" ? "var(--green)" : s === "active" ? "var(--cyan)" : "var(--muted)";
  return (
    <div style={{ padding: ".75rem 1rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        {steps.map((s, i) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".25rem", flex: 1 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${sc(st(s.id))}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".65rem", color: sc(st(s.id)), background: st(s.id) === "done" ? "rgba(0,255,136,.1)" : st(s.id) === "active" ? "rgba(0,180,255,.15)" : "transparent" }}>
                {st(s.id) === "done" ? SVGS.check : st(s.id) === "active" ? <span className="blink" style={{ fontSize: ".6rem" }}>●</span> : <span style={{ fontSize: ".55rem" }}>{s.id}</span>}
              </div>
              <div style={{ fontSize: ".55rem", color: sc(st(s.id)), textAlign: "center", fontFamily: "'Share Tech Mono',monospace", letterSpacing: ".03em", lineHeight: 1.3 }}>{s.s}</div>
              <div style={{ fontSize: ".58rem", color: sc(st(s.id)), fontWeight: 600 }}>{st(s.id) === "done" ? "Completed" : st(s.id) === "active" ? "In Progress" : "Waiting"}</div>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: st(s.id + 1) === "idle" || st(s.id + 1) === "wait" ? "var(--border)" : "var(--cyan)", margin: "0 .15rem", marginBottom: "2.2rem", transition: "background .5s" }} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function UploadPage() {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [stage, setStage] = useState(0);
  const [url, setUrl] = useState("");
  const [fc, setFc] = useState(0);
  const getType = f => { const e = f.name.split(".").pop().toLowerCase(); if (["jpg", "jpeg", "png", "webp", "bmp", "tiff"].includes(e)) return "image"; if (["mp4", "mov", "avi", "mkv", "webm"].includes(e)) return "video"; if (["mp3", "wav", "flac", "ogg", "m4a"].includes(e)) return "audio"; return null };
  const onFile = f => { setFile(f); setResult(null); setErr(""); setStage(0); setFc(c => c + 1) };
  const onDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer?.files?.[0] || e.target.files?.[0]; if (f) onFile(f) };
  const fmt = b => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
  const analyze = async () => {
    if (!file) return;
    const ft = getType(file);
    if (!ft) { setErr("Unsupported format."); return }
    setLoading(true); setErr(""); setResult(null);
    setStage(1); await new Promise(r => setTimeout(r, 350));
    setStage(2); await new Promise(r => setTimeout(r, 500));
    setStage(3); await new Promise(r => setTimeout(r, 600));
    setStage(4);
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch(`${API}/detect`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Detection failed");
      setStage(5); await new Promise(r => setTimeout(r, 250));
      setResult(data);
    } catch (e) { setErr(e.message); setStage(0); }
    finally { setLoading(false); }
  };
  const rc = result ? (RISK[result.risk_level] || RISK.Low) : null;
  const mediaId = file ? `DDS-${(getType(file) || "UNK").toUpperCase()}-${Date.now().toString().slice(-9)}` : "—";
  return (
    <div className="fade" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.7rem", fontWeight: 700, letterSpacing: ".08em", color: "var(--bright)", textTransform: "uppercase" }}>Media Upload & Analysis</h1>
          <p style={{ color: "var(--muted)", fontSize: ".78rem", marginTop: ".25rem" }}>AI-Powered Deepfake Detection · <span style={{ color: "var(--cyan)", fontFamily: "'Share Tech Mono',monospace" }}>No Login Required</span></p>
        </div>
        <div style={{ textAlign: "right", fontSize: ".7rem", color: "var(--muted)", fontFamily: "'Share Tech Mono',monospace" }}>
          <div style={{ color: "var(--cyan)" }}>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
          <div style={{ marginTop: ".2rem" }}>Classification: <span style={{ color: "var(--red)" }}>CONFIDENTIAL</span></div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Upload panel */}
        <div className="panel">
          <div className="ptitle"><span>Upload Zone</span><span style={{ fontFamily: "'Share Tech Mono',monospace", color: "var(--muted)" }}>{fc} / 100 FILES</span></div>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: ".75rem" }}>
            <div onDragOver={e => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop} onClick={() => document.getElementById("fi").click()}
              style={{ border: `1px dashed ${drag ? "var(--cyan)" : "rgba(0,180,255,.25)"}`, borderRadius: 8, padding: "1.75rem 1rem", textAlign: "center", cursor: "pointer", background: drag ? "rgba(0,180,255,.04)" : "rgba(0,0,0,.2)", minHeight: 160, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: ".6rem", position: "relative", overflow: "hidden", transition: "all .2s" }}>
              <input id="fi" type="file" hidden accept=".jpg,.jpeg,.png,.webp,.bmp,.tiff,.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.flac,.ogg,.m4a" onChange={onDrop} />
              {loading && <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,var(--cyan),transparent)", animation: "scan 2s linear infinite", zIndex: 2 }} />}
              <div style={{ color: "var(--cyan)", opacity: .6 }}><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg></div>
              {file ? (<><div style={{ fontWeight: 700, color: "var(--cyan)", fontSize: ".88rem" }}>{file.name}</div><div style={{ fontFamily: "'Share Tech Mono',monospace", color: "var(--muted)", fontSize: ".7rem" }}>{fmt(file.size)} · {getType(file)?.toUpperCase()}</div></>) : (<><div style={{ fontWeight: 600, color: "var(--text)", fontSize: ".88rem" }}>Drag-and-Drop or Browse</div><div style={{ fontFamily: "'Share Tech Mono',monospace", color: "var(--muted)", fontSize: ".68rem" }}>JPG, PNG, WEBP, BMP, TIFF (max 50MB)</div></>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".5rem" }}>
              {[{ icon: SVGS.video, label: "VIDEO", sub: "MP4, MOV, max 2GB" }, { icon: SVGS.audio, label: "AUDIO", sub: "MP3, WAV, max 500MB" }].map(({ icon, label, sub }) => (
                <div key={label} onClick={() => document.getElementById("fi").click()} style={{ background: "rgba(0,0,0,.25)", border: "1px solid var(--border)", borderRadius: 8, padding: ".7rem", display: "flex", flexDirection: "column", alignItems: "center", gap: ".3rem", cursor: "pointer", transition: "all .2s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(0,180,255,.4)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  <span style={{ color: "var(--cyan)" }}>{icon}</span>
                  <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: ".82rem", letterSpacing: ".08em", color: "var(--text)" }}>{label}</span>
                  <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".6rem", color: "var(--muted)" }}>{sub}</span>
                </div>
              ))}
            </div>
            <div><div style={{ fontSize: ".65rem", color: "var(--muted)", fontFamily: "'Share Tech Mono',monospace", marginBottom: ".35rem", letterSpacing: ".07em" }}>PUBLIC URL INGESTION</div><input type="text" placeholder="https://www.public URL ingestion" value={url} onChange={e => setUrl(e.target.value)} /></div>
            {err && <div style={{ background: "rgba(255,51,85,.1)", border: "1px solid rgba(255,51,85,.25)", borderRadius: 6, padding: ".55rem .8rem", color: "#ff3355", fontSize: ".75rem", fontFamily: "'Share Tech Mono',monospace" }}>⚠ {err}</div>}
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button className="btn" onClick={analyze} disabled={!file || loading} style={{ flex: 1, justifyContent: "center" }}>{loading ? <><span className="blink">●</span> ANALYZING...</> : "⟩ SCAN FOR DEEPFAKES"}</button>
              {file && <button className="btng" onClick={() => { setFile(null); setResult(null); setErr(""); setStage(0); }}>CLEAR</button>}
            </div>
          </div>
        </div>
        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="panel"><div className="ptitle"><span>Analysis Pipeline</span></div><Pipeline stage={stage} /></div>
          <div className="panel" style={{ flex: 1 }}>
            <div className="ptitle"><span>Latest Result</span>{result && <span style={{ fontFamily: "'Share Tech Mono',monospace", color: "var(--muted)", fontSize: ".62rem" }}>MEDIA ID: {mediaId}</span>}</div>
            <div style={{ padding: "1rem" }}>
              {!result && !loading && <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--muted)", fontSize: ".78rem" }}><div style={{ fontSize: "2rem", marginBottom: ".5rem", opacity: .25 }}>⟨⟩</div>Awaiting media upload...</div>}
              {loading && <div style={{ textAlign: "center", padding: "1.5rem 0" }}><div style={{ width: 34, height: 34, borderRadius: "50%", border: "2px solid rgba(0,180,255,.2)", borderTopColor: "var(--cyan)", animation: "spin .7s linear infinite", margin: "0 auto 1rem" }} /><div style={{ color: "var(--cyan)", fontSize: ".78rem", fontFamily: "'Share Tech Mono',monospace" }}>AI MODEL PROCESSING...</div></div>}
              {result && (
                <div className="fade" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1rem", alignItems: "start" }}>
                  <Gauge value={result.confidence} color={rc?.c} />
                  <div>
                    <div style={{ background: rc?.bg, border: `1px solid ${rc?.b}`, borderRadius: 6, padding: ".45rem .8rem", marginBottom: ".6rem", textAlign: "center" }}>
                      <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: ".9rem", letterSpacing: ".1em", color: rc?.c }}>{rc?.l}</div>
                    </div>
                    <div>
                      <div className="frow"><span style={{ color: "var(--muted)" }}>Manipulation:</span><span style={{ color: rc?.c, fontWeight: 600, textAlign: "right", maxWidth: "56%", fontSize: ".7rem" }}>{result.manipulation_type}</span></div>
                      <div className="frow"><span style={{ color: "var(--muted)" }}>Metadata:</span><span style={{ color: result.features?.has_exif ? "var(--green)" : "var(--red)", fontFamily: "'Share Tech Mono',monospace", fontSize: ".68rem" }}>{result.features?.has_exif ? "PRESENT" : "TAMPERING [DETECTED]"}</span></div>
                      <div className="frow"><span style={{ color: "var(--muted)" }}>Safety:</span><span style={{ fontFamily: "'Share Tech Mono',monospace", color: result.result === "Fake" ? "var(--red)" : "var(--green)", fontSize: ".7rem" }}>● {result.result === "Fake" ? "Safety Red" : "Safety Green"}</span></div>
                    </div>
                    <div style={{ display: "flex", gap: ".35rem", marginTop: ".7rem", flexWrap: "wrap" }}>
                      {["Generate PDF Report", "Export JSON", "Flag for Review"].map(l => <button key={l} className="btng" style={{ padding: ".28rem .55rem", fontSize: ".62rem" }}>{l}</button>)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {result && (
        <div className="fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="panel">
            <div className="ptitle"><span>AI Analysis Summary</span></div>
            <div style={{ padding: "1rem", fontSize: ".75rem", color: "#94a3b8", lineHeight: 1.8, fontFamily: "'Share Tech Mono',monospace" }}>{result.summary}</div>
          </div>
          <div className="panel">
            <div className="ptitle"><span>System Health & Analytics</span></div>
            <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".75rem" }}>
              {[{ l: "Avg. Response Time", v: result.file_type === "video" ? "3.2s (Video)" : "1.5s (Image)", c: "var(--cyan)" }, { l: "Detection Accuracy", v: "92.6%", c: "var(--green)" }, { l: "API Usage (v1.0)", v: "850/1000 RPS", c: "var(--yellow)" }].map(({ l, v, c }) => (
                <div key={l} style={{ background: "rgba(0,0,0,.2)", borderRadius: 8, padding: ".7rem" }}>
                  <div style={{ fontSize: ".6rem", color: "var(--muted)", fontFamily: "'Share Tech Mono',monospace", marginBottom: ".3rem", textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: ".9rem", color: c }}>{v}</div>
                  <svg width="100%" height="22" style={{ marginTop: ".35rem" }}><polyline points="0,18 12,12 24,15 36,8 48,13 60,6 72,10 84,7 96,9" fill="none" stroke={c} strokeWidth="1.5" opacity=".5" /></svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { apiFetch("/history").then(d => setItems(d.detections)).catch(() => { }).finally(() => setLoading(false)); }, []);
  const del = async id => { try { await apiFetch(`/history/${id}`, { method: "DELETE" }); setItems(i => i.filter(x => x.id !== id)); } catch (e) { alert(e.message); } };
  const RC = { Critical: "#ff3355", High: "#ff8c00", Medium: "#ffd700", Low: "#00ff88" };
  return (
    <div className="fade">
      <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.7rem", fontWeight: 700, letterSpacing: ".08em", color: "var(--bright)", textTransform: "uppercase", marginBottom: "1rem" }}>Detection History</h1>
      <div className="panel">
        <div className="ptitle"><span>All Detection Records</span><span style={{ fontFamily: "'Share Tech Mono',monospace", color: "var(--muted)", fontSize: ".62rem" }}>{items.length} RECORDS</span></div>
        {loading && <div style={{ padding: "2rem", textAlign: "center" }}><div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(0,180,255,.2)", borderTopColor: "var(--cyan)", animation: "spin .7s linear infinite", margin: "0 auto" }} /></div>}
        {!loading && items.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)", fontSize: ".78rem" }}>No detections yet. Upload a file to get started.</div>}
        {items.map((d, i) => {
          const rc = RC[d.risk_level] || "#00ff88";
          return (
            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: ".75rem", padding: ".6rem 1rem", borderBottom: "1px solid var(--border2)", flexWrap: "wrap" }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".62rem", color: "var(--muted)", minWidth: 26 }}>#{String(i + 1).padStart(3, "0")}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: ".82rem", color: "var(--bright)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.file_name}</div>
                <div style={{ fontSize: ".65rem", color: "var(--muted)", fontFamily: "'Share Tech Mono',monospace", marginTop: ".1rem" }}>{new Date(d.created_at).toLocaleString()} · {d.file_type?.toUpperCase()} · {d.manipulation_type}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexShrink: 0 }}>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".7rem", color: d.result === "Fake" ? "var(--red)" : "var(--green)", background: d.result === "Fake" ? "rgba(255,51,85,.1)" : "rgba(0,255,136,.1)", border: `1px solid ${d.result === "Fake" ? "rgba(255,51,85,.3)" : "rgba(0,255,136,.3)"}`, padding: ".2rem .55rem", borderRadius: 4 }}>● {d.result}</span>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".7rem", color: rc, background: `${rc}18`, border: `1px solid ${rc}44`, padding: ".2rem .5rem", borderRadius: 4 }}>{d.risk_level}</span>
                <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".78rem", fontWeight: 700, color: rc, minWidth: 44, textAlign: "right" }}>{d.confidence}%</span>
                <button onClick={() => del(d.id)} style={{ background: "rgba(255,51,85,.08)", border: "1px solid rgba(255,51,85,.2)", color: "#ff3355", borderRadius: 5, padding: ".28rem .45rem", cursor: "pointer" }}>{SVGS.trash}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [hist, setHist] = useState([]);
  useEffect(() => { apiFetch("/stats").then(setStats).catch(() => { }); apiFetch("/history?per_page=6").then(d => setHist(d.detections)).catch(() => { }); }, []);
  const MC = ({ l, v, c }) => (<div className="panel" style={{ padding: "1rem", textAlign: "center" }}><div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "2.2rem", fontWeight: 800, color: c || "var(--cyan)", lineHeight: 1 }}>{v ?? 0}</div><div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".6rem", color: "var(--muted)", marginTop: ".3rem", textTransform: "uppercase", letterSpacing: ".08em" }}>{l}</div></div>);
  return (
    <div className="fade">
      <h1 style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.7rem", fontWeight: 700, letterSpacing: ".08em", color: "var(--bright)", textTransform: "uppercase", marginBottom: "1rem" }}>Dashboard</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: ".75rem", marginBottom: "1rem" }}>
        <MC l="Total Analyses" v={stats?.total} c="var(--cyan)" />
        <MC l="Fakes Detected" v={stats?.fakes} c="var(--red)" />
        <MC l="Authentic Media" v={stats?.reals} c="var(--green)" />
        <MC l="Images Scanned" v={stats?.by_type?.image} c="#a78bfa" />
        <MC l="Videos Scanned" v={stats?.by_type?.video} c="#60a5fa" />
        <MC l="Audio Analyzed" v={stats?.by_type?.audio} c="#34d399" />
      </div>
      {hist.length > 0 && (<div className="panel"><div className="ptitle"><span>Recent Detections</span></div>{hist.map(d => (<div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: ".55rem 1rem", borderBottom: "1px solid var(--border2)" }}><div><div style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--bright)" }}>{d.file_name}</div><div style={{ fontSize: ".65rem", color: "var(--muted)", fontFamily: "'Share Tech Mono',monospace" }}>{new Date(d.created_at).toLocaleString()}</div></div><div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}><span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".7rem", color: d.result === "Fake" ? "var(--red)" : "var(--green)" }}>● {d.result}</span><span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: ".75rem", color: "var(--cyan)" }}>{d.confidence}%</span></div></div>))}</div>)}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("upload");
  const NAV = [{ id: "dashboard", l: "Dashboard", ic: SVGS.dash }, { id: "upload", l: "Upload & Analyze", ic: SVGS.upload }, { id: "history", l: "Detection History", ic: SVGS.history }, { id: "api", l: "API Console", ic: SVGS.code }, { id: "settings", l: "Settings", ic: SVGS.cog }, { id: "admin", l: "Admin Panel", ic: SVGS.admin }];
  return (
    <div className="grid-bg" style={{ display: "flex", minHeight: "100vh" }}>
      <style>{CSS}</style>
      {/* Sidebar */}
      <aside style={{ width: 215, background: "var(--sidebar)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "1.1rem 1.1rem", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: ".55rem" }}>
            <div style={{ width: 30, height: 30, background: "linear-gradient(135deg,rgba(0,180,255,.2),rgba(0,212,255,.1))", border: "1px solid rgba(0,180,255,.3)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--cyan)", animation: "glow 3s ease infinite" }}>{SVGS.shield}</div>
            <div><div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: ".8rem", letterSpacing: ".1em", color: "var(--bright)", textTransform: "uppercase", lineHeight: 1.1 }}>Deepfake</div><div style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: ".8rem", letterSpacing: ".1em", color: "var(--cyan)", textTransform: "uppercase", lineHeight: 1.1 }}>Detection System</div></div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: ".65rem .5rem", display: "flex", flexDirection: "column", gap: ".12rem" }}>
          {NAV.map(({ id, l, ic }) => (<button key={id} className={`nav-item${page === id ? " active" : ""}`} onClick={() => setPage(id)}>{ic}{l}</button>))}
        </nav>
        <div style={{ padding: ".65rem .5rem", borderTop: "1px solid var(--border)" }}>
          <button className="nav-item">{SVGS.logout} Logout</button>
          <div style={{ padding: ".4rem 1.1rem", fontSize: ".6rem", color: "var(--muted)", fontFamily: "'Share Tech Mono',monospace", lineHeight: 1.6 }}>
            <div style={{ color: "rgba(255,51,85,.6)" }}>Classification: CONFIDENTIAL</div>
            <div>DDS-SRS-2025-001 | IEEE 830-1998</div>
          </div>
        </div>
      </aside>
      {/* Main */}
      <main style={{ flex: 1, padding: "1.5rem", overflowY: "auto", maxHeight: "100vh" }}>
        {page === "upload" && <UploadPage />}
        {page === "history" && <HistoryPage />}
        {page === "dashboard" && <DashboardPage />}
        {["api", "settings", "admin"].includes(page) && (
          <div className="fade" style={{ textAlign: "center", padding: "4rem", color: "var(--muted)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: .2 }}>⟨/⟩</div>
            <div style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "1.2rem", letterSpacing: ".1em", textTransform: "uppercase" }}>{page.toUpperCase()} — Coming Soon</div>
          </div>
        )}
      </main>
    </div>
  );
}