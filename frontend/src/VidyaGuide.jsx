import { useState, useRef, useEffect, useCallback } from "react";

// ── API Layer ─────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";
const post = async (path, body) => {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const api = {
  upload:    async (file) => { const fd = new FormData(); fd.append("file",file); const r = await fetch(`${API_BASE}/upload-resume`,{method:"POST",body:fd}); if(!r.ok) throw new Error(await r.text()); return r.json(); },
  analyze:   (b) => post("/analyze", b),
  chat:      (b) => post("/chat", b),
  tailor:    (b) => post("/tailor-resume", b),
  questions: (b) => post("/generate-questions", b),
  evaluate:  (b) => post("/evaluate-answer", b),
  projects:  (b) => post("/generate-projects", b),
  schedule:  (b) => post("/generate-schedule", b),
  findJobs:  (b) => post("/find-jobs", b),
  health:    async () => { const r = await fetch(`${API_BASE}/health`); return r.json(); },
};

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;min-height:100vh}
  :root{
    --bg:#080c14;--surface:#0d1421;--surface2:#111928;
    --border:rgba(99,179,237,.12);--accent:#3b82f6;--accent2:#06b6d4;
    --accent3:#8b5cf6;--gold:#f59e0b;--text:#e2e8f0;--muted:#64748b;
    --success:#10b981;--danger:#ef4444;--rose:#f43f5e;
  }
  body{background:var(--bg);color:var(--text);font-family:'DM Mono',monospace}
  #root{width:100%}
  .app{width:100%;min-height:100vh;background:var(--bg);
    background-image:
      radial-gradient(ellipse 80% 40% at 50% 0%,rgba(59,130,246,.10) 0%,transparent 60%),
      radial-gradient(ellipse 60% 30% at 80% 100%,rgba(6,182,212,.06) 0%,transparent 60%),
      repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(99,179,237,.03) 60px),
      repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(99,179,237,.03) 60px);
  }
  .orb{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0;animation:orbFloat 8s ease-in-out infinite}
  .orb1{width:500px;height:500px;background:radial-gradient(circle,rgba(59,130,246,.18) 0%,transparent 70%);top:-100px;left:-100px}
  .orb2{width:400px;height:400px;background:radial-gradient(circle,rgba(139,92,246,.14) 0%,transparent 70%);bottom:-80px;right:-80px;animation-delay:-3s}
  .orb3{width:300px;height:300px;background:radial-gradient(circle,rgba(6,182,212,.12) 0%,transparent 70%);top:40%;left:60%;animation-delay:-5s}
  @keyframes orbFloat{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-20px) scale(1.05)}66%{transform:translate(-20px,30px) scale(.97)}}
  .landing{width:100%;min-height:100vh;position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4rem 1.5rem 3rem;text-align:center;overflow:hidden}
  .landing-inner{width:100%;max-width:780px;margin:0 auto;display:flex;flex-direction:column;align-items:center;position:relative;z-index:2}
  .badge{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,rgba(59,130,246,.15),rgba(139,92,246,.1));border:1px solid rgba(99,179,237,.25);border-radius:100px;padding:8px 20px;font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:#a5c8ff;margin-bottom:2.5rem;animation:fadeDown .6s ease both;backdrop-filter:blur(10px)}
  .pulse{width:7px;height:7px;border-radius:50%;background:var(--accent2);animation:pulse 1.5s infinite;flex-shrink:0;box-shadow:0 0 8px var(--accent2)}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.4)}}
  .hero-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(2.8rem,6.5vw,6rem);line-height:1.0;letter-spacing:-3px;margin-bottom:1.8rem;animation:fadeDown .7s .1s ease both;width:100%}
  .gradient{background:linear-gradient(135deg,#60a5fa 0%,#06b6d4 45%,#a78bfa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;filter:drop-shadow(0 0 30px rgba(99,179,237,.3))}
  .hero-sub{font-size:.95rem;color:#94a3b8;max-width:520px;line-height:2;margin-bottom:1rem;animation:fadeDown .8s .2s ease both}
  .cta-row{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;animation:fadeDown .9s .3s ease both;width:100%}
  .btn-shine{position:relative;overflow:hidden;background:linear-gradient(135deg,#3b82f6,#06b6d4);color:#fff;font-size:14px;padding:16px 36px;border-radius:14px;box-shadow:0 0 40px rgba(59,130,246,.5),0 4px 20px rgba(0,0,0,.3);letter-spacing:.5px;font-weight:600;cursor:pointer;border:none}
  .btn-shine::before{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);animation:shimmer 3s infinite}
  .btn-shine:hover{transform:translateY(-3px);box-shadow:0 0 60px rgba(59,130,246,.7),0 8px 30px rgba(0,0,0,.4)}
  @keyframes shimmer{to{left:200%}}
  .feature-row{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center;margin-top:3.5rem;width:100%;animation:fadeUp .8s .4s ease both}
  .feature-card{display:flex;flex-direction:column;align-items:center;gap:8px;background:rgba(13,20,33,.7);border:1px solid rgba(99,179,237,.12);border-radius:16px;padding:1rem 1.2rem;flex:1;min-width:100px;max-width:130px;backdrop-filter:blur(12px);transition:all .3s;cursor:default}
  .feature-card:hover{border-color:rgba(99,179,237,.35);background:rgba(59,130,246,.08);transform:translateY(-4px)}
  .feature-icon{font-size:1.6rem;filter:drop-shadow(0 0 8px rgba(99,179,237,.4))}
  .feature-label{font-size:10px;color:#94a3b8;letter-spacing:.5px;text-align:center}
  @keyframes fadeDown{from{opacity:0;transform:translateY(-20px)}to{opacity:1;transform:none}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 28px;border-radius:10px;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;border:none;letter-spacing:.5px;white-space:nowrap}
  .btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;box-shadow:0 0 30px rgba(59,130,246,.35)}
  .btn-primary:hover{transform:translateY(-2px);box-shadow:0 0 45px rgba(59,130,246,.5)}
  .btn-ghost{background:transparent;color:var(--text);border:1px solid var(--border)}
  .btn-ghost:hover{border-color:var(--accent);color:var(--accent)}
  .btn-purple{background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;box-shadow:0 0 25px rgba(139,92,246,.3)}
  .btn-purple:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(139,92,246,.5)}
  .btn-gold{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 0 25px rgba(245,158,11,.3)}
  .btn-gold:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(245,158,11,.5)}
  .btn-teal{background:linear-gradient(135deg,#10b981,#06b6d4);color:#fff;box-shadow:0 0 25px rgba(16,185,129,.3)}
  .btn-teal:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(16,185,129,.5)}
  .btn-rose{background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff;box-shadow:0 0 25px rgba(244,63,94,.3)}
  .btn-rose:hover{transform:translateY(-2px);box-shadow:0 0 40px rgba(244,63,94,.5)}
  .btn-sm{padding:9px 18px;font-size:12px}
  .btn:disabled{opacity:.45;cursor:not-allowed;transform:none !important}
  .topbar{width:100%;display:flex;align-items:center;justify-content:space-between;padding:1rem 1.5rem;border-bottom:1px solid var(--border);background:rgba(8,12,20,.9);backdrop-filter:blur(20px);position:sticky;top:0;z-index:100;gap:12px;flex-wrap:wrap}
  .logo{font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem;cursor:pointer;flex-shrink:0}
  .logo span{color:var(--accent2)}
  .tabs{display:flex;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:4px;flex-wrap:wrap}
  .tab{padding:7px 12px;border-radius:7px;cursor:pointer;font-size:11px;font-family:'DM Mono',monospace;letter-spacing:.4px;transition:all .2s;border:none;background:transparent;color:var(--muted);white-space:nowrap}
  .tab.active{background:var(--accent);color:#fff}
  .tab:hover:not(.active){color:var(--text);background:var(--surface2)}
  .main{flex:1;padding:1.5rem;max-width:1400px;margin:0 auto;width:100%}
  @media(max-width:600px){.main{padding:1rem}.topbar{padding:.75rem 1rem}}
  .setup{max-width:720px;margin:0 auto;animation:fadeUp .5s ease;width:100%}
  .setup-section{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.2rem}
  .setup-section-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;margin-bottom:1rem;color:#f1f5f9}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  @media(max-width:600px){.two-col{grid-template-columns:1fr}}
  .pref-preview{background:rgba(59,130,246,.05);border:1px solid rgba(59,130,246,.15);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1rem}
  .panel-title{font-family:'Syne',sans-serif;font-size:1.8rem;font-weight:700;margin-bottom:.5rem}
  .panel-sub{color:var(--muted);font-size:13px;margin-bottom:2rem;line-height:1.7}
  .label{display:block;font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px}
  .fgroup{margin-bottom:1.5rem}
  .dropzone{border:2px dashed var(--border);border-radius:16px;padding:2.5rem 1.5rem;text-align:center;cursor:pointer;transition:all .3s;background:var(--surface);width:100%}
  .dropzone:hover,.dropzone.over{border-color:var(--accent);background:rgba(59,130,246,.06)}
  .dz-icon{font-size:3rem;margin-bottom:1rem}
  .dz-title{font-family:'Syne',sans-serif;font-size:1.1rem;font-weight:600;margin-bottom:.5rem}
  .dz-sub{color:var(--muted);font-size:12px}
  .file-chip{display:inline-flex;align-items:center;gap:8px;margin-top:1rem;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3);border-radius:8px;padding:8px 14px;font-size:12px;color:var(--success)}
  .finput{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--text);font-family:'DM Mono',monospace;font-size:14px;outline:none;transition:border-color .2s}
  .finput:focus{border-color:var(--accent)}
  .finput::placeholder{color:var(--muted)}
  select.finput option{background:var(--surface2)}
  .tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
  .tag{background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:6px;padding:5px 12px;font-size:12px;color:var(--accent);cursor:pointer;transition:all .2s}
  .tag.sel{background:var(--accent);color:#fff;border-color:var(--accent)}
  .loading{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:1.5rem;text-align:center;padding:2rem}
  .spinner{width:48px;height:48px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 1s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .loading-title{font-family:'Syne',sans-serif;font-size:1.1rem}
  .loading-step{font-size:12px;color:var(--muted);animation:fadeDown .4s ease}
  .dashboard{display:grid;grid-template-columns:300px 1fr;gap:1.5rem;animation:fadeUp .5s ease;width:100%}
  @media(max-width:1000px){.dashboard{grid-template-columns:1fr}}
  .card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem;width:100%}
  @media(max-width:480px){.card{padding:1rem;border-radius:12px}}
  .card-title{font-family:'Syne',sans-serif;font-size:.85rem;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:1.2rem;display:flex;align-items:center;gap:8px}
  .card-title::before{content:'';display:block;width:3px;height:14px;background:var(--accent);border-radius:2px;flex-shrink:0}
  .ring-wrap{display:flex;flex-direction:column;align-items:center;margin-bottom:1.5rem}
  .ring{position:relative;width:140px;height:140px}
  .ring svg{transform:rotate(-90deg)}
  .ring-val{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:2.5rem;font-weight:800}
  .ring-lbl{font-size:11px;color:var(--muted);margin-top:4px}
  .skill-item{margin-bottom:1rem}
  .skill-head{display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px}
  .skill-pct{color:var(--accent2)}
  .skill-bar{height:6px;background:var(--surface2);border-radius:3px;overflow:hidden}
  .skill-fill{height:100%;border-radius:3px;transition:width 1s cubic-bezier(.4,0,.2,1)}
  .gap-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:var(--surface2);border-radius:10px;margin-bottom:8px;border-left:3px solid}
  .gap-item.critical{border-color:var(--danger)}.gap-item.moderate{border-color:var(--gold)}.gap-item.minor{border-color:var(--success)}
  .gap-severity{font-size:10px;letter-spacing:1px;text-transform:uppercase;flex-shrink:0;margin-top:2px}
  .gap-item.critical .gap-severity{color:var(--danger)}.gap-item.moderate .gap-severity{color:var(--gold)}.gap-item.minor .gap-severity{color:var(--success)}
  .companies-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem}
  .company-card{background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:1.1rem 1.3rem;transition:all .3s;cursor:default;position:relative;overflow:hidden}
  .company-card::before{content:'';position:absolute;top:0;left:0;width:3px;height:100%;border-radius:3px 0 0 3px}
  .company-card.fit-high::before{background:linear-gradient(to bottom,#10b981,#06b6d4)}
  .company-card.fit-medium::before{background:linear-gradient(to bottom,#f59e0b,#f97316)}
  .company-card:hover{transform:translateY(-3px);border-color:rgba(99,179,237,.3);box-shadow:0 10px 30px rgba(0,0,0,.3)}
  .company-top{display:flex;align-items:center;gap:10px;margin-bottom:.6rem}
  .company-logo{font-size:1.6rem;flex-shrink:0}
  .company-name{font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;color:#f1f5f9}
  .company-type{font-size:10px;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
  .company-fit-badge{margin-left:auto;font-size:10px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:.5px}
  .company-fit-badge.high{background:rgba(16,185,129,.15);color:#10b981;border:1px solid rgba(16,185,129,.3)}
  .company-fit-badge.medium{background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3)}
  .company-why{font-size:11px;color:#94a3b8;line-height:1.6;margin-bottom:.7rem}
  .company-meta{display:flex;gap:8px;flex-wrap:wrap}
  .company-tag{font-size:10px;padding:3px 8px;border-radius:4px}
  .company-tag.hiring{background:rgba(59,130,246,.1);color:var(--accent);border:1px solid rgba(59,130,246,.2)}
  .company-tag.salary{background:rgba(16,185,129,.1);color:#10b981;border:1px solid rgba(16,185,129,.2)}
  .fit-bar-wrap{margin-top:.7rem}
  .fit-bar-label{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px}
  .fit-bar{height:4px;background:var(--surface);border-radius:2px;overflow:hidden}
  .fit-bar-fill{height:100%;border-radius:2px;transition:width 1s ease}
  .company-card.fit-high .fit-bar-fill{background:linear-gradient(90deg,#10b981,#06b6d4)}
  .company-card.fit-medium .fit-bar-fill{background:linear-gradient(90deg,#f59e0b,#f97316)}
  .roadmap{max-width:900px;margin:0 auto;animation:fadeUp .5s ease;width:100%;padding-bottom:3rem}
  .rm-header{text-align:center;margin-bottom:2.5rem}
  .rm-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(1.6rem,4vw,2.4rem);margin-bottom:.6rem}
  .rm-sub{font-size:.9rem;color:var(--muted);max-width:480px;margin:0 auto;line-height:1.8}
  .rm-progress{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.4rem 2rem;margin-bottom:2.5rem;display:flex;align-items:center;gap:2rem;flex-wrap:wrap}
  .rm-prog-label{font-size:12px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;white-space:nowrap}
  .rm-prog-track{flex:1;min-width:160px;height:8px;background:var(--surface2);border-radius:4px;overflow:hidden}
  .rm-prog-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#3b82f6,#06b6d4,#8b5cf6);transition:width 1.2s cubic-bezier(.4,0,.2,1);box-shadow:0 0 10px rgba(59,130,246,.4)}
  .rm-prog-pct{font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;white-space:nowrap}
  .rm-phases{display:flex;gap:1rem;flex-wrap:wrap}
  .rm-phase-dot{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--muted)}
  .rm-phase-dot span{width:8px;height:8px;border-radius:50%}
  .rm-phases-stack{display:flex;flex-direction:column;gap:1.2rem;margin-bottom:2rem}
  .phase-card{border-radius:20px;overflow:hidden;border:1px solid var(--border);background:var(--surface);transition:all .3s}
  .phase-card:hover{box-shadow:0 16px 50px rgba(0,0,0,.35);transform:translateY(-3px)}
  .phase-top{display:flex;align-items:center;gap:1.2rem;padding:1.4rem 1.8rem}
  .phase-top.immediate{background:linear-gradient(135deg,rgba(239,68,68,.12),rgba(249,115,22,.08));border-bottom:1px solid rgba(239,68,68,.15)}
  .phase-top.short{background:linear-gradient(135deg,rgba(245,158,11,.12),rgba(234,179,8,.08));border-bottom:1px solid rgba(245,158,11,.15)}
  .phase-top.long{background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(6,182,212,.08));border-bottom:1px solid rgba(16,185,129,.15)}
  .phase-num{flex-shrink:0;width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.3rem}
  .phase-top.immediate .phase-num{background:rgba(239,68,68,.2);color:#ef4444}
  .phase-top.short .phase-num{background:rgba(245,158,11,.2);color:#f59e0b}
  .phase-top.long .phase-num{background:rgba(16,185,129,.2);color:#10b981}
  .phase-info{flex:1;min-width:0}
  .phase-timeframe{font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;margin-bottom:3px}
  .phase-top.immediate .phase-timeframe{color:#ef4444}.phase-top.short .phase-timeframe{color:#f59e0b}.phase-top.long .phase-timeframe{color:#10b981}
  .phase-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1.05rem;color:#f1f5f9}
  .phase-body{padding:1.2rem 1.8rem 1.5rem}
  .phase-desc{font-size:13px;color:#94a3b8;line-height:1.9;margin-bottom:1rem}
  .phase-checks{display:flex;flex-direction:column;gap:8px}
  .phase-check{display:flex;align-items:center;gap:10px;font-size:12px;color:#cbd5e1}
  .check-box{width:18px;height:18px;border-radius:5px;border:1.5px solid rgba(99,179,237,.3);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--accent)}
  .courses-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:1rem}
  .course2{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.4rem;transition:all .3s;position:relative;overflow:hidden;display:flex;flex-direction:column;gap:.5rem}
  .course2::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--accent2));transform:scaleX(0);transition:transform .3s;transform-origin:left;border-radius:2px 2px 0 0}
  .course2:hover{border-color:rgba(99,179,237,.3);transform:translateY(-4px);box-shadow:0 12px 35px rgba(0,0,0,.3)}
  .course2:hover::before{transform:scaleX(1)}
  .course2-plat{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--accent2)}
  .course2-title{font-family:'Syne',sans-serif;font-weight:600;font-size:.92rem;color:#f1f5f9;line-height:1.4}
  .course2-meta{font-size:12px;color:var(--muted);line-height:1.6;flex:1}
  .course2-link{display:inline-flex;align-items:center;gap:5px;font-size:11px;padding:5px 12px;background:rgba(6,182,212,.1);border-radius:20px;color:var(--accent2);border:1px solid rgba(6,182,212,.2);text-decoration:none;width:fit-content;transition:all .2s;margin-top:auto}
  .course2-link:hover{background:rgba(6,182,212,.2);transform:translateY(-1px)}
  .rm-cta{border-radius:20px;padding:2rem 2.5rem;text-align:center;margin-top:2rem;background:linear-gradient(135deg,rgba(59,130,246,.1),rgba(139,92,246,.1));border:1px solid rgba(139,92,246,.2)}
  .rm-cta-emoji{font-size:2.5rem;margin-bottom:.8rem}
  .rm-cta-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1.2rem;margin-bottom:.4rem}
  .rm-cta-sub{font-size:13px;color:var(--muted);margin-bottom:1.5rem}
  .course{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:.8rem;transition:border-color .2s;width:100%}
  .course:hover{border-color:var(--accent2)}
  .course-title{font-family:'Syne',sans-serif;font-weight:600;font-size:.9rem;margin-bottom:.3rem}
  .course-meta{font-size:11px;color:var(--muted)}
  .course-plat{display:inline-block;margin-top:6px;padding:3px 8px;border-radius:4px;font-size:10px;background:rgba(6,182,212,.15);color:var(--accent2)}
  .course-link{display:inline-flex;align-items:center;gap:4px;margin-top:8px;font-size:11px;color:var(--accent2);text-decoration:none;border:1px solid rgba(6,182,212,.25);border-radius:6px;padding:4px 10px;transition:all .2s}
  .course-link:hover{background:rgba(6,182,212,.1);transform:translateX(2px)}
  .feature-page{max-width:900px;margin:0 auto;animation:fadeUp .5s ease;width:100%;padding-bottom:3rem}
  .feature-header{margin-bottom:2rem}
  .feature-title{font-family:'Syne',sans-serif;font-weight:800;font-size:clamp(1.4rem,3vw,2rem);margin-bottom:.5rem}
  .feature-sub{font-size:.9rem;color:var(--muted);line-height:1.8}
  .ats-bar-row{display:flex;align-items:center;gap:1.5rem;margin-bottom:1.5rem;flex-wrap:wrap}
  .ats-score-box{text-align:center;padding:.8rem 1.5rem;border-radius:12px;min-width:80px}
  .ats-score-box.before{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3)}
  .ats-score-box.after{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.3)}
  .ats-num{font-family:'Syne',sans-serif;font-weight:800;font-size:1.8rem}
  .ats-score-box.before .ats-num{color:#ef4444}
  .ats-score-box.after .ats-num{color:#10b981}
  .ats-label{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:1px}
  .bullet-list{display:flex;flex-direction:column;gap:.6rem}
  .bullet-item{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:.8rem 1rem;font-size:13px;line-height:1.7;border-left:3px solid var(--success)}
  .keyword-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:.5rem}
  .keyword-chip{font-size:10px;padding:3px 10px;border-radius:20px;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.25);color:var(--accent)}
  .keyword-chip.missing{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.25);color:#ef4444}
  .tip-item{display:flex;align-items:flex-start;gap:8px;padding:.6rem .8rem;background:rgba(245,158,11,.06);border-radius:8px;border-left:2px solid var(--gold);font-size:12px;color:#cbd5e1;margin-bottom:6px}

  /* ══ VOICE INTERVIEW ══ */
  .interview-mode-toggle{display:flex;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:4px;margin-bottom:1.5rem;width:fit-content}
  .mode-btn{padding:8px 20px;border-radius:7px;cursor:pointer;font-size:12px;font-family:'DM Mono',monospace;border:none;background:transparent;color:var(--muted);transition:all .2s}
  .mode-btn.active{background:var(--accent);color:#fff}
  .voice-shell{display:flex;flex-direction:column;gap:1.5rem}
  .voice-question-card{background:linear-gradient(135deg,rgba(139,92,246,.1),rgba(59,130,246,.08));border:1px solid rgba(139,92,246,.25);border-radius:20px;padding:2rem;position:relative;overflow:hidden}
  .voice-question-card::before{content:'';position:absolute;top:0;right:0;width:120px;height:120px;background:radial-gradient(circle,rgba(139,92,246,.15) 0%,transparent 70%)}
  .vq-meta{display:flex;align-items:center;gap:10px;margin-bottom:1rem}
  .vq-num{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;flex-shrink:0}
  .vq-type{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--accent3)}
  .vq-diff{font-size:10px;padding:3px 10px;border-radius:10px;background:rgba(245,158,11,.12);color:var(--gold);border:1px solid rgba(245,158,11,.2)}
  .vq-text{font-size:15px;line-height:1.8;color:#f1f5f9;font-family:'Syne',sans-serif;font-weight:600}
  .vq-nav{display:flex;align-items:center;gap:10px;margin-top:1.5rem;flex-wrap:wrap}
  .vq-progress{font-size:11px;color:var(--muted);flex:1}
  .mic-area{display:flex;flex-direction:column;align-items:center;gap:1.5rem;padding:2rem;background:var(--surface);border:1px solid var(--border);border-radius:20px}
  .mic-btn{width:80px;height:80px;border-radius:50%;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:2rem;transition:all .3s;position:relative}
  .mic-btn.idle{background:linear-gradient(135deg,#3b82f6,#8b5cf6);box-shadow:0 0 30px rgba(59,130,246,.4)}
  .mic-btn.idle:hover{transform:scale(1.08);box-shadow:0 0 50px rgba(59,130,246,.6)}
  .mic-btn.recording{background:linear-gradient(135deg,#ef4444,#f43f5e);box-shadow:0 0 0 0 rgba(239,68,68,.4);animation:micPulse 1.5s infinite}
  @keyframes micPulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.5)}70%{box-shadow:0 0 0 20px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
  .mic-status{font-size:13px;color:var(--muted);text-align:center}
  .mic-status.recording{color:var(--danger);animation:blink .8s infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
  .transcript-box{width:100%;min-height:100px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;font-size:13px;line-height:1.8;color:var(--text);position:relative}
  .transcript-box.has-content{border-color:rgba(59,130,246,.3)}
  .transcript-interim{color:var(--muted);font-style:italic}
  .transcript-placeholder{color:var(--muted);font-style:italic}
  .voice-hint{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:.5rem}
  .voice-hint-chip{font-size:11px;padding:4px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;color:var(--muted)}
  .eval-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:1.5rem;animation:fadeUp .4s ease}
  .eval-top{display:flex;align-items:center;gap:1.5rem;margin-bottom:1.5rem;flex-wrap:wrap}
  .score-circle{width:80px;height:80px;border-radius:50%;border:4px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0}
  .score-num{font-family:'Syne',sans-serif;font-weight:800;font-size:1.5rem;line-height:1}
  .score-denom{font-size:10px;color:var(--muted)}
  .eval-verdict{font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;margin-bottom:.3rem}
  .eval-breakdown{font-size:11px;color:var(--muted)}
  .eval-cols{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem}
  @media(max-width:600px){.eval-cols{grid-template-columns:1fr}}
  .eval-col-title{font-size:11px;font-weight:600;margin-bottom:.5rem;text-transform:uppercase;letter-spacing:.5px}
  .eval-point{font-size:12px;color:#cbd5e1;margin-bottom:.4rem;padding-left:8px;border-left:2px solid;line-height:1.5}
  .ideal-box{background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:8px;padding:.8rem 1rem;font-size:12px;color:#cbd5e1;line-height:1.7;margin-bottom:.8rem}
  .followup-box{background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.2);border-radius:8px;padding:.7rem 1rem;font-size:12px;color:var(--accent3)}
  .permission-error{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:12px;padding:1.2rem;font-size:13px;color:#ef4444;text-align:center}
  .q-nav{display:flex;gap:8px;margin-bottom:1.5rem;flex-wrap:wrap}
  .q-nav-btn{padding:8px 16px;border-radius:8px;font-size:12px;font-family:'DM Mono',monospace;cursor:pointer;border:1px solid var(--border);background:transparent;color:var(--muted);transition:all .2s}
  .q-nav-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
  .q-nav-btn.done{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.3);color:var(--success)}

  /* ══ LIVE JOBS ══ */
  .jobs-page{max-width:900px;margin:0 auto;animation:fadeUp .5s ease;width:100%;padding-bottom:3rem}
  .jobs-header{margin-bottom:1.5rem}
  .jobs-filter{display:flex;gap:.8rem;align-items:center;flex-wrap:wrap;margin-bottom:1.5rem}
  .jobs-filter-label{font-size:11px;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
  .jobs-grid{display:flex;flex-direction:column;gap:1rem}
  .job-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden;transition:all .3s;animation:fadeUp .4s ease both}
  .job-card:hover{transform:translateY(-3px);box-shadow:0 16px 50px rgba(0,0,0,.3);border-color:rgba(99,179,237,.25)}
  .job-inner{display:flex;align-items:center;gap:1.2rem;padding:1.4rem 1.8rem;flex-wrap:wrap}
  .job-logo{font-size:2.2rem;flex-shrink:0;width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:var(--surface2);border-radius:14px;border:1px solid var(--border)}
  .job-info{flex:1;min-width:200px}
  .job-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;color:#f1f5f9;margin-bottom:.25rem}
  .job-company{font-size:13px;color:var(--accent2);margin-bottom:.25rem}
  .job-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:.4rem}
  .job-tag{font-size:10px;padding:3px 9px;border-radius:20px}
  .job-tag.loc{background:rgba(59,130,246,.1);color:var(--accent);border:1px solid rgba(59,130,246,.2)}
  .job-tag.type{background:rgba(16,185,129,.1);color:var(--success);border:1px solid rgba(16,185,129,.2)}
  .job-tag.salary{background:rgba(245,158,11,.1);color:var(--gold);border:1px solid rgba(245,158,11,.2)}
  .job-tag.posted{background:var(--surface2);color:var(--muted);border:1px solid var(--border)}
  .job-right{display:flex;flex-direction:column;align-items:flex-end;gap:.6rem;flex-shrink:0}
  .match-badge{font-family:'Syne',sans-serif;font-weight:800;font-size:.85rem;padding:4px 12px;border-radius:20px;white-space:nowrap}
  .match-badge.high{background:rgba(16,185,129,.15);color:var(--success);border:1px solid rgba(16,185,129,.3)}
  .match-badge.med{background:rgba(245,158,11,.15);color:var(--gold);border:1px solid rgba(245,158,11,.3)}
  .match-badge.low{background:rgba(99,179,237,.1);color:var(--muted);border:1px solid var(--border)}
  .apply-btn{display:inline-flex;align-items:center;gap:6px;padding:10px 20px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-family:'DM Mono',monospace;font-size:12px;font-weight:600;text-decoration:none;transition:all .2s;border:none;cursor:pointer;white-space:nowrap}
  .apply-btn:hover{transform:translateY(-2px);box-shadow:0 0 30px rgba(59,130,246,.4)}
  .job-source{font-size:9px;color:var(--muted);text-align:right;padding:0 1.8rem .8rem;letter-spacing:.5px;text-transform:uppercase}
  .jobs-empty{text-align:center;padding:3rem 2rem;background:var(--surface);border:1px solid var(--border);border-radius:16px}
  .live-dot{width:8px;height:8px;border-radius:50%;background:var(--success);animation:pulse 1.5s infinite;display:inline-block;margin-right:6px;box-shadow:0 0 8px var(--success)}

  /* ══ SCHEDULE ══ */
  .week-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;margin-bottom:1rem;overflow:hidden;animation:fadeUp .4s ease both}
  .week-header{padding:1rem 1.5rem;display:flex;align-items:center;gap:1rem;border-bottom:1px solid var(--border);cursor:pointer;transition:background .2s}
  .week-header:hover{background:rgba(59,130,246,.04)}
  .week-num{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:.9rem;flex-shrink:0}
  .week-info{flex:1}
  .week-theme{font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;color:#f1f5f9}
  .week-focus{font-size:11px;color:var(--muted);margin-top:2px}
  .week-hours{font-size:11px;color:var(--accent2);background:rgba(6,182,212,.1);padding:3px 10px;border-radius:20px;border:1px solid rgba(6,182,212,.2)}
  .week-tasks{padding:1rem 1.5rem;display:flex;flex-direction:column;gap:.6rem}
  .task-item{display:flex;align-items:flex-start;gap:10px;padding:.7rem 1rem;background:var(--surface2);border-radius:10px;border-left:3px solid}
  .task-item.course{border-color:var(--accent)}.task-item.project{border-color:var(--accent3)}.task-item.practice{border-color:var(--success)}
  .task-title{font-size:13px;font-weight:600;color:#f1f5f9;margin-bottom:2px}
  .task-desc{font-size:11px;color:var(--muted);line-height:1.5}
  .task-dur{font-size:10px;color:var(--accent2);margin-top:4px}
  .milestone-row{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem}
  .milestone{flex:1;min-width:180px;background:linear-gradient(135deg,rgba(59,130,246,.08),rgba(139,92,246,.06));border:1px solid rgba(139,92,246,.2);border-radius:12px;padding:1rem 1.2rem}
  .milestone-week{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--accent3);margin-bottom:4px}
  .milestone-goal{font-size:13px;color:#f1f5f9;line-height:1.5}
  .ics-cta{background:linear-gradient(135deg,rgba(16,185,129,.1),rgba(6,182,212,.08));border:1px solid rgba(16,185,129,.2);border-radius:16px;padding:1.5rem 2rem;display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;margin-top:1.5rem}
  .ics-text{flex:1}
  .ics-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;margin-bottom:.3rem}
  .ics-sub{font-size:12px;color:var(--muted)}

  /* ══ PROJECT CARDS ══ */
  .project-card{background:var(--surface);border:1px solid var(--border);border-radius:20px;overflow:hidden;margin-bottom:1.5rem;animation:fadeUp .5s ease both;transition:all .3s}
  .project-card:hover{transform:translateY(-3px);box-shadow:0 16px 50px rgba(0,0,0,.3)}
  .project-header{padding:1.5rem 1.8rem;background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(59,130,246,.08));border-bottom:1px solid rgba(139,92,246,.15)}
  .project-title{font-family:'Syne',sans-serif;font-weight:800;font-size:1.2rem;margin-bottom:.3rem;color:#f1f5f9}
  .project-tagline{font-size:13px;color:var(--accent3)}
  .project-meta{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:.8rem}
  .project-badge{font-size:10px;padding:3px 10px;border-radius:20px;font-weight:600}
  .project-badge.difficulty{background:rgba(245,158,11,.15);color:var(--gold);border:1px solid rgba(245,158,11,.25)}
  .project-badge.time{background:rgba(16,185,129,.15);color:var(--success);border:1px solid rgba(16,185,129,.25)}
  .project-badge.gap{background:rgba(139,92,246,.15);color:var(--accent3);border:1px solid rgba(139,92,246,.25)}
  .project-body{padding:1.5rem 1.8rem}
  .project-stack{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:1rem}
  .stack-chip{font-size:11px;padding:4px 10px;background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.2);border-radius:6px;color:var(--accent)}
  .project-steps{list-style:none;display:flex;flex-direction:column;gap:.5rem;margin-bottom:1rem}
  .project-step{display:flex;gap:10px;font-size:12px;color:#cbd5e1;align-items:flex-start}
  .step-num{width:20px;height:20px;border-radius:50%;background:rgba(59,130,246,.2);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;margin-top:1px}
  .bonus-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:.5rem}
  .bonus-chip{font-size:10px;padding:3px 10px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:6px;color:var(--success)}
  .readme-tip{background:rgba(245,158,11,.06);border:1px solid rgba(245,158,11,.15);border-radius:8px;padding:.7rem 1rem;font-size:12px;color:#cbd5e1;margin-top:.8rem;display:flex;gap:8px;align-items:flex-start}

  /* ══ CHAT ══ */
  .chat-shell{display:flex;flex-direction:column;height:calc(100vh - 80px);max-width:900px;margin:0 auto;animation:fadeUp .5s ease;width:100%}
  .chat-msgs{flex:1;overflow-y:auto;padding:1rem 0;display:flex;flex-direction:column;gap:1rem}
  .chat-msgs::-webkit-scrollbar{width:4px}.chat-msgs::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
  .msg{display:flex;gap:12px;animation:fadeUp .3s ease}
  .msg.user{flex-direction:row-reverse}
  .avatar{flex-shrink:0;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px}
  .avatar.ai{background:linear-gradient(135deg,var(--accent),var(--accent3))}
  .avatar.user{background:var(--surface2);border:1px solid var(--border)}
  .bubble{max-width:72%;padding:14px 18px;border-radius:16px;font-size:13px;line-height:1.8}
  .bubble.ai{background:var(--surface);border:1px solid var(--border);border-bottom-left-radius:4px}
  .bubble.user{background:linear-gradient(135deg,var(--accent),#2563eb);color:#fff;border-bottom-right-radius:4px}
  .bubble strong{font-weight:600;color:var(--accent2)}
  .bubble.user strong{color:#bae6fd}
  .chat-footer{border-top:1px solid var(--border);padding:1rem 0}
  .quick-qs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:1rem}
  .quick-q{padding:7px 14px;border-radius:20px;font-size:12px;background:var(--surface);border:1px solid var(--border);color:var(--muted);cursor:pointer;transition:all .2s;font-family:'DM Mono',monospace}
  .quick-q:hover{border-color:var(--accent);color:var(--accent)}
  .input-row{display:flex;gap:12px}
  .chat-in{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 18px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;resize:none;min-height:52px;max-height:150px;transition:border-color .2s}
  .chat-in:focus{border-color:var(--accent)}
  .send-btn{width:52px;height:52px;border-radius:12px;border:none;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
  .send-btn:hover{transform:scale(1.05);box-shadow:0 0 20px rgba(59,130,246,.4)}
  .send-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .typing{display:flex;gap:4px;padding:6px 0}
  .td{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:typingDot 1.2s infinite}
  .td:nth-child(2){animation-delay:.2s}.td:nth-child(3){animation-delay:.4s}
  @keyframes typingDot{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px);background:var(--accent)}}

  /* ══ MISC ══ */
  .status-bar{display:flex;align-items:center;gap:8px;font-size:11px;color:var(--success);padding:6px 12px;background:rgba(16,185,129,.08);border:1px solid rgba(16,185,129,.2);border-radius:8px;margin-bottom:1rem}
  .profile-card{background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:1rem 1.2rem;margin-bottom:1.2rem}
  .profile-name{font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;margin-bottom:.25rem}
  .profile-meta{font-size:12px;color:var(--muted)}
  .strengths{display:flex;flex-wrap:wrap;gap:8px}
  .strength{background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);border-radius:8px;padding:6px 14px;font-size:12px;color:var(--success)}
  .error-bar{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:12px 16px;font-size:13px;color:#ef4444;margin-bottom:1rem}
  .info-box{background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.2);border-radius:12px;padding:1.2rem;margin-bottom:1.5rem;font-size:13px;line-height:1.7}
  .model-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(139,92,246,.1);border:1px solid rgba(139,92,246,.25);border-radius:6px;padding:4px 10px;font-size:11px;color:var(--accent3)}
  .ai-loading{display:flex;align-items:center;gap:12px;padding:1rem;background:rgba(59,130,246,.06);border:1px solid rgba(59,130,246,.15);border-radius:12px;font-size:13px;color:var(--muted)}
  .divider{height:1px;background:var(--border);margin:1.5rem 0}
  .text-answer-area{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:12px 16px;color:var(--text);font-family:'DM Mono',monospace;font-size:13px;outline:none;resize:vertical;min-height:100px;transition:border-color .2s;margin-top:.8rem}
  .text-answer-area:focus{border-color:var(--accent3)}
`;

// ── Data ──────────────────────────────────────────────────────────────────────
const CAREER_FIELDS  = ["Software Engineering","Data & AI","DevOps & Cloud","Product & Design","Cybersecurity","Blockchain & Web3","Mobile Development","Game Development","Embedded Systems","Research & Academia"];
const JOB_TYPES      = ["Full-time","Part-time","Internship","Freelance","Remote","Hybrid","On-site","Startup","MNC","Government"];
const LOCATIONS      = ["Bangalore","Hyderabad","Mumbai","Delhi NCR","Pune","Chennai","Remote (India)","Remote (Global)","USA","UK","Canada","Dubai"];
const SALARY_RANGES  = ["Below ₹5 LPA","₹5–10 LPA","₹10–20 LPA","₹20–40 LPA","₹40+ LPA","Negotiable","$50–80K USD","$80–120K USD","$120K+ USD"];
const JOB_ROLES      = ["Full Stack Developer","Data Scientist","ML Engineer","DevOps / Cloud Engineer","Product Manager","UX Designer","Cybersecurity Analyst","Blockchain Developer"];
const QUICK_QUESTIONS = ["What's my biggest skill gap?","Which course should I start first?","How long to be job-ready?","Suggest 3 projects I can build now","How to improve my resume?"];

// Company DB
const COMPANY_DB = {
  "Full Stack Developer":[
    {name:"Google",logo:"🔵",type:"MNC",fit:"high",why:"React, Node, Go — matches your stack",hiring:"SWE, Full Stack",salary:"₹20–45 LPA"},
    {name:"Razorpay",logo:"🟣",type:"Startup",fit:"high",why:"React + Node heavy, loves T-shaped devs",hiring:"Full Stack Engineer",salary:"₹18–35 LPA"},
    {name:"Swiggy",logo:"🟠",type:"Startup",fit:"high",why:"Fast-paced full stack culture, great comp",hiring:"SDE-II, Full Stack",salary:"₹20–40 LPA"},
    {name:"Infosys",logo:"🔷",type:"Service",fit:"medium",why:"Good for freshers, large scale projects",hiring:"System Engineer",salary:"₹3.5–6 LPA"},
    {name:"Atlassian",logo:"🔵",type:"Product",fit:"high",why:"React + REST APIs across all products",hiring:"Full Stack Developer",salary:"₹25–50 LPA"},
    {name:"Zepto",logo:"🟡",type:"Startup",fit:"medium",why:"High growth, React Native + Node",hiring:"SDE Full Stack",salary:"₹15–30 LPA"},
  ],
  "Data Scientist":[
    {name:"Amazon",logo:"🟠",type:"MNC",fit:"high",why:"Heavy ML/DS, Python + SQL stack",hiring:"Data Scientist L4-L5",salary:"₹25–55 LPA"},
    {name:"Flipkart",logo:"🟡",type:"Product",fit:"high",why:"Strong DS team, recommendation systems",hiring:"Data Scientist",salary:"₹20–40 LPA"},
    {name:"PhonePe",logo:"🟣",type:"Fintech",fit:"high",why:"Fraud detection + ML pipelines",hiring:"Data Scientist",salary:"₹18–35 LPA"},
    {name:"Mu Sigma",logo:"🔵",type:"Service",fit:"medium",why:"Analytics-first, great for freshers",hiring:"Decision Scientist",salary:"₹4–8 LPA"},
    {name:"CRED",logo:"⚫",type:"Startup",fit:"medium",why:"User analytics, Python + Spark",hiring:"Data Analyst/Scientist",salary:"₹15–28 LPA"},
    {name:"Fractal",logo:"🔷",type:"Service",fit:"high",why:"Pure analytics company, diverse ML projects",hiring:"Data Scientist",salary:"₹8–18 LPA"},
  ],
};
const DEFAULT_COMPANIES = [
  {name:"Google",logo:"🔵",type:"MNC",fit:"high",why:"Top employer for tech globally",hiring:"Software Engineer",salary:"₹20–50 LPA"},
  {name:"Microsoft",logo:"🔵",type:"MNC",fit:"high",why:"Diverse tech roles, great culture",hiring:"SDE",salary:"₹25–55 LPA"},
  {name:"Razorpay",logo:"🟣",type:"Startup",fit:"high",why:"Fast-growing fintech, excellent comp",hiring:"Engineer",salary:"₹18–35 LPA"},
  {name:"Infosys",logo:"🔷",type:"Service",fit:"medium",why:"Large scale, good for freshers",hiring:"System Engineer",salary:"₹3.5–6 LPA"},
  {name:"Swiggy",logo:"🟠",type:"Startup",fit:"medium",why:"High-growth consumer tech",hiring:"SDE",salary:"₹15–30 LPA"},
  {name:"Freshworks",logo:"🟢",type:"Product",fit:"high",why:"SaaS product company, strong eng culture",hiring:"Engineer",salary:"₹15–30 LPA"},
];
function getCompanies(role, matchScore) {
  const list = COMPANY_DB[role] || DEFAULT_COMPANIES;
  return list.map(c=>({...c,fitScore:c.fit==="high"?(matchScore>=60?92:72):(matchScore>=60?74:58)})).sort((a,b)=>b.fitScore-a.fitScore);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VidyaGuide() {
  const [screen, setScreen]           = useState("landing");
  const [activeTab, setActiveTab]     = useState("dashboard");
  const [file, setFile]               = useState(null);
  const [sessionId, setSessionId]     = useState(null);
  const [targetRole, setTargetRole]   = useState("");
  const [experience, setExperience]   = useState("fresher");
  const [careerField, setCareerField] = useState("");
  const [jobTypes, setJobTypes]       = useState([]);
  const [location, setLocation]       = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [careerGoal, setCareerGoal]   = useState("");
  const [analysis, setAnalysis]       = useState(null);
  const [loadingStep, setLoadingStep] = useState("");
  const [error, setError]             = useState("");
  const [groqStatus, setGroqStatus]   = useState(null);
  const [dragOver, setDragOver]       = useState(false);

  // Chat
  const [messages, setMessages]       = useState([]);
  const [chatInput, setChatInput]     = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Tailor
  const [jdText, setJdText]             = useState("");
  const [tailorResult, setTailorResult] = useState(null);
  const [tailorLoading, setTailorLoading] = useState(false);

  // Interview — shared state
  const [interviewMode, setInterviewMode] = useState("voice"); // "voice" | "text"
  const [questions, setQuestions]         = useState([]);
  const [qLoading, setQLoading]           = useState(false);
  const [activeQ, setActiveQ]             = useState(0);
  const [evaluations, setEvaluations]     = useState({});
  const [evalLoading, setEvalLoading]     = useState(false);
  // Voice specific
  const [isListening, setIsListening]     = useState(false);
  const [transcript, setTranscript]       = useState("");
  const [interimText, setInterimText]     = useState("");
  const [micError, setMicError]           = useState("");
  const recognitionRef = useRef(null);
  // Text specific
  const [textAnswers, setTextAnswers]     = useState({});

  // Projects
  const [projects, setProjects]     = useState([]);
  const [projLoading, setProjLoading] = useState(false);

  // Schedule
  const [schedule, setSchedule]     = useState(null);
  const [schedLoading, setSchedLoading] = useState(false);
  const [icsData, setIcsData]       = useState("");
  const [openWeeks, setOpenWeeks]   = useState([0]);

  // Live Jobs
  const [jobs, setJobs]           = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsLoaded, setJobsLoaded]   = useState(false);
  const [jobLocation, setJobLocation] = useState("India");

  const fileRef = useRef(null);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({behavior:"smooth"}); }, [messages]);
  useEffect(() => {
    if (screen === "setup") api.health().then(setGroqStatus).catch(() => setGroqStatus({status:"offline"}));
  }, [screen]);

  // ── Voice Recognition Setup ───────────────────────────────────────────────
  const initRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return null;
    const r = new SR();
    r.continuous      = true;
    r.interimResults  = true;
    r.lang            = "en-US";
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let final = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t + " ";
        else interim += t;
      }
      if (final) setTranscript(prev => prev + final);
      setInterimText(interim);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setMicError("Microphone permission denied. Please allow mic access in your browser settings.");
      else if (e.error === "no-speech") setMicError("No speech detected. Please try again.");
      else setMicError(`Speech recognition error: ${e.error}`);
      setIsListening(false);
    };
    r.onend = () => { setIsListening(false); setInterimText(""); };
    return r;
  }, []);

  const startListening = () => {
    setMicError(""); setTranscript(""); setInterimText("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setMicError("Your browser doesn't support voice recognition. Try Chrome or Edge."); return; }
    if (!recognitionRef.current) recognitionRef.current = initRecognition();
    try { recognitionRef.current.start(); setIsListening(true); }
    catch(e) { setMicError("Could not start microphone. Is another tab using it?"); }
  };

  const stopListening = () => {
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    setIsListening(false); setInterimText("");
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFile = useCallback((f) => {
    if (!f || f.type !== "application/pdf") return alert("Please upload a PDF file.");
    setFile(f);
  }, []);

  const handleAnalyze = async () => {
    if (!file || !targetRole) return;
    setError(""); setScreen("analyzing");
    try {
      setLoadingStep("📄 Uploading & parsing resume...");
      const up  = await api.upload(file);
      const sid = up.session_id;
      setSessionId(sid);
      setLoadingStep("🧠 Running gap analysis...");
      const res = await api.analyze({session_id:sid, target_role:targetRole, experience_level:experience, career_field:careerField, job_types:jobTypes, preferred_location:location, salary_range:salaryRange, career_goal:careerGoal});
      setLoadingStep("✨ Building your personalized roadmap...");
      await new Promise(r => setTimeout(r, 500));
      setAnalysis({...res, targetRole, careerField, jobTypes, location, salaryRange, careerGoal});
      setMessages([{role:"ai",content:`Hey ${res.profile?.name||"there"}! 👋 I've analyzed your resume for **${targetRole}** roles.\n\nYour match score is **${res.gap_analysis?.matchScore}%**. ${res.gap_analysis?.summary||""}\n\nAsk me anything — skill gaps, salary tips, interview prep, or project ideas!`}]);
      setScreen("dashboard");
    } catch(e) { setError(e.message||"Analysis failed."); setScreen("setup"); }
  };

  const sendChat = async (text) => {
    const msg = text || chatInput;
    if (!msg.trim() || chatLoading || !sessionId) return;
    setChatInput("");
    setMessages(prev => [...prev, {role:"user",content:msg}]);
    setChatLoading(true);
    try {
      const res = await api.chat({session_id:sessionId, message:msg});
      setMessages(prev => [...prev, {role:"ai",content:res.reply}]);
    } catch {
      setMessages(prev => [...prev, {role:"ai",content:"Connection error. Make sure your GROQ_API_KEY is set in .env."}]);
    }
    setChatLoading(false);
  };

  const handleTailor = async () => {
    if (!jdText.trim() || !sessionId) return;
    setTailorLoading(true); setTailorResult(null);
    try { setTailorResult(await api.tailor({session_id:sessionId, job_description:jdText})); }
    catch(e) { alert("Tailor failed: " + e.message); }
    setTailorLoading(false);
  };

  const handleGenerateQuestions = async () => {
    if (!sessionId) return;
    setQLoading(true); setQuestions([]); setEvaluations({}); setTextAnswers({});
    setTranscript(""); setActiveQ(0);
    try {
      const res = await api.questions({session_id:sessionId, num_questions:3});
      setQuestions(res.questions || []);
    } catch(e) { alert("Failed: " + e.message); }
    setQLoading(false);
  };

  const handleEvaluate = async (qIdx, answer) => {
    const q = questions[qIdx];
    const ans = answer || (interviewMode==="text" ? textAnswers[qIdx] : transcript);
    if (!ans?.trim()) return alert("Please provide your answer first.");
    setEvalLoading(true);
    try {
      const res = await api.evaluate({session_id:sessionId, question:q.question, answer:ans});
      setEvaluations(prev => ({...prev, [qIdx]: res}));
    } catch(e) { alert("Evaluation failed: " + e.message); }
    setEvalLoading(false);
  };

  const handleGenerateProjects = async () => {
    if (!sessionId) return;
    setProjLoading(true); setProjects([]);
    try {
      const res = await api.projects({session_id:sessionId});
      setProjects(res.projects || []);
    } catch(e) { alert("Failed: " + e.message); }
    setProjLoading(false);
  };

  const handleGenerateSchedule = async () => {
    if (!sessionId) return;
    setSchedLoading(true); setSchedule(null);
    try {
      const res = await api.schedule({session_id:sessionId});
      setSchedule(res.schedule); setIcsData(res.ics_download||"");
    } catch(e) { alert("Failed: " + e.message); }
    setSchedLoading(false);
  };

  const handleFindJobs = async () => {
    if (!sessionId) return;
    setJobsLoading(true); setJobs([]);
    try {
      const res = await api.findJobs({session_id:sessionId, location:jobLocation, num_results:5});
      setJobs(res.jobs||[]); setJobsLoaded(true);
    } catch(e) { alert("Job search failed: " + e.message); }
    setJobsLoading(false);
  };

  const downloadIcs = () => {
    const blob = new Blob([icsData],{type:"text/calendar"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "VidyaGuide_StudyPlan.ics"; a.click();
  };

  const fmt = (t) => t.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br/>");
  const {profile, gap_analysis:gap} = analysis || {};
  const scoreColor = (gap?.matchScore>=75)?"var(--success)":(gap?.matchScore>=50)?"var(--gold)":"var(--danger)";
  const circ   = 2*Math.PI*52;
  const dashOff = circ-(circ*(gap?.matchScore||0))/100;

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREENS
  // ═══════════════════════════════════════════════════════════════════════════

  if (screen === "landing") return (
    <><style>{STYLES}</style>
    <div className="app">
      <div className="orb orb1"/><div className="orb orb2"/><div className="orb orb3"/>
      <div className="landing">
        <div className="landing-inner">
          <div className="badge"><div className="pulse"/>Groq AI · llama3-8b · Voice Interview · Live Jobs</div>
          <h1 className="hero-title">Your Career <span className="gradient">Reimagined.</span></h1>
          <p className="hero-sub">Resume analysis · ATS tailoring · Voice mock interviews · Portfolio projects · Live job matching — all powered by Groq AI.</p>
          <div className="cta-row">
            <button className="btn-shine" onClick={() => setScreen("setup")}>✦ &nbsp;Start Your Journey</button>
          </div>
          <div className="feature-row">
            {[["📄","Resume Tailor"],["🎤","Voice Interview"],["💡","Projects"],["📅","Schedule"],["🗺️","Roadmap"],["💼","Live Jobs"],["💬","AI Mentor"]].map(([icon,label]) => (
              <div className="feature-card" key={label}><div className="feature-icon">{icon}</div><div className="feature-label">{label}</div></div>
            ))}
          </div>
        </div>
      </div>
    </div></>
  );

  if (screen === "setup") return (
    <><style>{STYLES}</style>
    <div className="app" style={{display:"flex",flexDirection:"column"}}>
      <div className="topbar">
        <div className="logo" onClick={() => setScreen("landing")}>Vidya<span>Guide</span></div>
        <div className="model-badge">🤖 llama3-8b · Groq</div>
      </div>
      <div className="main">
        <div className="setup">
          <div className="panel-title">Build Your Career Profile 🚀</div>
          <p className="panel-sub">Fill in your details — the more you share, the more personalized your roadmap will be.</p>
          {groqStatus && <div className="info-box">{groqStatus.groq_configured ? "✅ Groq API connected! Voice interview & AI features ready." : "⚠️ Add GROQ_API_KEY to your .env file. Free at https://console.groq.com"}</div>}
          {error && <div className="error-bar">❌ {error}</div>}

          <div className="setup-section">
            <div className="setup-section-title">📄 Step 1 — Upload Resume</div>
            <div className={`dropzone${dragOver?" over":""}`} onClick={() => fileRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0])}}>
              {file ? <><div className="dz-icon">✅</div><div className="dz-title">Resume Ready</div><div className="file-chip">📄 {file.name}</div></> : <><div className="dz-icon">📁</div><div className="dz-title">Drop your resume here</div><div className="dz-sub">PDF only · Click to browse</div></>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
          </div>

          <div className="setup-section">
            <div className="setup-section-title">🎯 Step 2 — Target Role</div>
            <div className="tags" style={{marginBottom:12}}>
              {JOB_ROLES.map(r=><div key={r} className={`tag${targetRole===r?" sel":""}`} onClick={()=>setTargetRole(r)}>{r}</div>)}
            </div>
            <input className="finput" placeholder="Or type a custom role..." value={JOB_ROLES.includes(targetRole)?"":targetRole} onChange={e=>setTargetRole(e.target.value)}/>
          </div>

          <div className="setup-section">
            <div className="setup-section-title">💼 Step 3 — Career Field & Experience</div>
            <div className="fgroup">
              <label className="label">Career Field</label>
              <div className="tags">{CAREER_FIELDS.map(f=><div key={f} className={`tag${careerField===f?" sel":""}`} onClick={()=>setCareerField(f)}>{f}</div>)}</div>
            </div>
            <div className="fgroup">
              <label className="label">Experience Level</label>
              <select className="finput" value={experience} onChange={e=>setExperience(e.target.value)}>
                <option value="fresher">Fresher / Student</option>
                <option value="0-1 years">0–1 Years</option>
                <option value="1-3 years">1–3 Years</option>
                <option value="3+ years">3+ Years</option>
              </select>
            </div>
          </div>

          <div className="setup-section">
            <div className="setup-section-title">⚙️ Step 4 — Job Preferences</div>
            <div className="fgroup">
              <label className="label">Job Types</label>
              <div className="tags">{JOB_TYPES.map(t=><div key={t} className={`tag${jobTypes.includes(t)?" sel":""}`} onClick={()=>setJobTypes(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t])}>{t}</div>)}</div>
            </div>
            <div className="two-col">
              <div className="fgroup">
                <label className="label">📍 Location</label>
                <div className="tags">{LOCATIONS.map(l=><div key={l} className={`tag${location===l?" sel":""}`} onClick={()=>setLocation(l)}>{l}</div>)}</div>
              </div>
              <div className="fgroup">
                <label className="label">💰 Salary</label>
                <div className="tags">{SALARY_RANGES.map(s=><div key={s} className={`tag${salaryRange===s?" sel":""}`} onClick={()=>setSalaryRange(s)}>{s}</div>)}</div>
              </div>
            </div>
          </div>

          <div className="setup-section">
            <div className="setup-section-title">🌟 Step 5 — Career Goal <span style={{fontSize:11,color:"var(--muted)",fontWeight:400}}>(optional)</span></div>
            <textarea className="finput" rows={3} placeholder="e.g. I want to become a Senior Full Stack Developer at a startup within 1 year..." value={careerGoal} onChange={e=>setCareerGoal(e.target.value)} style={{resize:"vertical",lineHeight:1.7}}/>
          </div>

          {(careerField||jobTypes.length||location||salaryRange) && (
            <div className="pref-preview">
              <div style={{fontSize:11,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Your preferences:</div>
              <div className="tags">
                {careerField&&<div className="tag sel">💼 {careerField}</div>}
                {jobTypes.map(t=><div key={t} className="tag sel">⚙️ {t}</div>)}
                {location&&<div className="tag sel">📍 {location}</div>}
                {salaryRange&&<div className="tag sel">💰 {salaryRange}</div>}
              </div>
            </div>
          )}

          <button className="btn btn-primary" style={{width:"100%",justifyContent:"center",padding:18,fontSize:15,marginTop:"1rem"}}
            onClick={handleAnalyze} disabled={!file||!targetRole}>
            {!file?"📄 Upload a resume first":!targetRole?"🎯 Select a target role":"✦ Analyze My Profile →"}
          </button>
        </div>
      </div>
    </div></>
  );

  if (screen === "analyzing") return (
    <><style>{STYLES}</style>
    <div className="app">
      <div className="loading">
        <div className="spinner"/>
        <div className="loading-title">Analyzing your profile...</div>
        <div className="loading-step" key={loadingStep}>{loadingStep}</div>
        <div style={{fontSize:11,color:"var(--muted)",marginTop:8}}>Groq · llama3-8b · instant analysis · 0ms latency</div>
      </div>
    </div></>
  );

  // Dashboard
  const TABS = [
    {id:"dashboard", label:"Dashboard"},
    {id:"tailor",    label:"✂ Tailor"},
    {id:"interview", label:"🎤 Interview"},
    {id:"projects",  label:"💡 Projects"},
    {id:"schedule",  label:"📅 Schedule"},
    {id:"roadmap",   label:"🗺 Roadmap"},
    {id:"jobs",      label:"💼 Live Jobs"},
    {id:"chat",      label:"💬 AI Mentor"},
  ];

  // ── Shared EvalCard Component ─────────────────────────────────────────────
  const EvalCard = ({ev}) => {
    const sc = ev.score||0;
    const col = sc>=7?"var(--success)":sc>=5?"var(--gold)":"var(--danger)";
    return (
      <div className="eval-card" style={{marginTop:"1.2rem"}}>
        <div className="eval-top">
          <div className="score-circle" style={{borderColor:col,color:col}}>
            <div className="score-num">{sc}</div>
            <div className="score-denom">/ 10</div>
          </div>
          <div>
            <div className="eval-verdict">{ev.verdict}</div>
            {ev.score_breakdown&&<div className="eval-breakdown">Tech: {ev.score_breakdown.technical_accuracy}/10 · Comm: {ev.score_breakdown.communication}/10 · Depth: {ev.score_breakdown.depth}/10</div>}
          </div>
        </div>
        <div className="eval-cols">
          <div>
            <div className="eval-col-title" style={{color:"var(--success)"}}>✅ Strengths</div>
            {(ev.strengths||[]).map((s,i)=><div key={i} className="eval-point" style={{borderColor:"var(--success)"}}>{s}</div>)}
          </div>
          <div>
            <div className="eval-col-title" style={{color:"var(--gold)"}}>⚡ Improve</div>
            {(ev.improvements||[]).map((s,i)=><div key={i} className="eval-point" style={{borderColor:"var(--gold)"}}>{s}</div>)}
          </div>
        </div>
        {ev.ideal_answer_summary&&<div className="ideal-box"><strong style={{color:"var(--accent)"}}>📖 Ideal Answer: </strong>{ev.ideal_answer_summary}</div>}
        {ev.follow_up_question&&<div className="followup-box">🔁 Follow-up: <em>{ev.follow_up_question}</em></div>}
      </div>
    );
  };

  return (
    <><style>{STYLES}</style>
    <div className="app" style={{display:"flex",flexDirection:"column"}}>
      <div className="topbar">
        <div className="logo" onClick={()=>setScreen("landing")}>Vidya<span>Guide</span></div>
        <div className="tabs">{TABS.map(t=><button key={t.id} className={`tab${activeTab===t.id?" active":""}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>)}</div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div className="model-badge">🤖 Groq AI</div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setScreen("setup")}>↑ New</button>
        </div>
      </div>

      <div className="main">

        {/* ════════════════════ DASHBOARD ════════════════════════════════════ */}
        {activeTab === "dashboard" && (
          <div className="dashboard">
            <div>
              <div className="card" style={{marginBottom:"1.5rem"}}>
                <div className="profile-card">
                  <div className="profile-name">{profile?.name||"Candidate"}</div>
                  {profile?.email&&<div className="profile-meta">{profile.email}</div>}
                  <div className="profile-meta" style={{marginTop:4,color:"var(--accent2)"}}>🎯 {analysis?.targetRole}</div>
                  {analysis?.careerField&&<div className="profile-meta" style={{marginTop:3}}>💼 {analysis.careerField}</div>}
                  {analysis?.location&&<div className="profile-meta" style={{marginTop:3}}>📍 {analysis.location}</div>}
                  {analysis?.salaryRange&&<div className="profile-meta" style={{marginTop:3}}>💰 {analysis.salaryRange}</div>}
                  {analysis?.jobTypes?.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:8}}>{analysis.jobTypes.map(t=><span key={t} style={{fontSize:10,padding:"2px 8px",background:"rgba(59,130,246,.1)",border:"1px solid rgba(59,130,246,.2)",borderRadius:4,color:"var(--accent)"}}>{t}</span>)}</div>}
                </div>
                <div className="card-title">Match Score</div>
                <div className="ring-wrap">
                  <div className="ring">
                    <svg viewBox="0 0 120 120" width="140" height="140">
                      <circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface2)" strokeWidth="10"/>
                      <circle cx="60" cy="60" r="52" fill="none" stroke={scoreColor} strokeWidth="10" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={dashOff} style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)"}}/>
                    </svg>
                    <div className="ring-val" style={{color:scoreColor}}>{gap?.matchScore}<div className="ring-lbl">/ 100</div></div>
                  </div>
                  <div style={{fontSize:12,color:"var(--muted)",marginTop:8}}>{gap?.matchScore>=75?"🔥 Strong Match":gap?.matchScore>=50?"⚡ Good Potential":"🛠️ Needs Work"}</div>
                </div>
                <div className="card-title">Skill Readiness</div>
                {(gap?.skillBars||[]).map(s=>(
                  <div className="skill-item" key={s.name}>
                    <div className="skill-head"><span>{s.name}</span><span className="skill-pct">{s.percentage}%</span></div>
                    <div className="skill-bar"><div className="skill-fill" style={{width:`${s.percentage}%`,background:s.percentage>70?"var(--success)":s.percentage>40?"var(--gold)":"var(--danger)"}}/></div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="status-bar"><div className="pulse"/> Analysis ready · {new Date().toLocaleDateString()} · Groq · llama3-8b</div>
              <div className="card" style={{marginBottom:"1.5rem"}}>
                <div className="card-title">Skill Gaps to Close</div>
                {(gap?.gaps||[]).map((g,i)=>(
                  <div key={i} className={`gap-item ${g.severity}`}>
                    <div style={{fontSize:16}}>{g.severity==="critical"?"🔴":g.severity==="moderate"?"🟡":"🟢"}</div>
                    <div style={{flex:1}}><div style={{fontSize:13}}>{g.skill}</div><div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{g.reason}</div></div>
                    <div className="gap-severity">{g.severity}</div>
                  </div>
                ))}
              </div>
              <div className="card" style={{marginBottom:"1.5rem"}}>
                <div className="card-title">Strengths</div>
                <div className="strengths">{(gap?.strengths||[]).map((s,i)=><div key={i} className="strength">✓ {s}</div>)}</div>
              </div>
              <div className="card" style={{marginBottom:"1.5rem"}}>
                <div className="card-title">Recommended Courses</div>
                {(gap?.courses||[]).map((c,i)=>(
                  <div key={i} className="course">
                    <div className="course-title">{c.title}</div>
                    <div className="course-meta">⏱ {c.duration} · {c.why}</div>
                    <div className="course-plat">{c.platform}</div>
                    {c.url&&<a href={c.url} target="_blank" rel="noopener noreferrer" className="course-link">🔗 Start Learning →</a>}
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-title">🏢 Companies You'd Fit At</div>
                <div style={{fontSize:12,color:"var(--muted)",marginBottom:"1rem",lineHeight:1.6}}>
                  Based on your skills & {analysis?.targetRole} — {gap?.matchScore>=70?"you're competitive right now!":"close gaps to unlock top-tier roles."}
                </div>
                <div className="companies-grid">
                  {getCompanies(analysis?.targetRole, gap?.matchScore||0).map((c,i)=>(
                    <div key={i} className={`company-card fit-${c.fit}`}>
                      <div className="company-top">
                        <div className="company-logo">{c.logo}</div>
                        <div><div className="company-name">{c.name}</div><div className="company-type">{c.type}</div></div>
                        <div className={`company-fit-badge ${c.fit}`}>{c.fit==="high"?"✦ Great Fit":"~ Good Fit"}</div>
                      </div>
                      <div className="company-why">{c.why}</div>
                      <div className="company-meta">
                        <span className="company-tag hiring">🧑‍💻 {c.hiring}</span>
                        <span className="company-tag salary">💰 {c.salary}</span>
                      </div>
                      <div className="fit-bar-wrap">
                        <div className="fit-bar-label"><span>Profile Match</span><span style={{color:c.fit==="high"?"#10b981":"#f59e0b"}}>{c.fitScore}%</span></div>
                        <div className="fit-bar"><div className="fit-bar-fill" style={{width:`${c.fitScore}%`}}/></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ TAILOR RESUME ═══════════════════════════════ */}
        {activeTab === "tailor" && (
          <div className="feature-page">
            <div className="feature-header">
              <div className="feature-title">✂️ One-Click Resume Tailoring</div>
              <div className="feature-sub">Paste a job description and AI rewrites your bullets to be ATS-optimized and keyword-matched for that specific role.</div>
            </div>
            <div className="card" style={{marginBottom:"1.5rem"}}>
              <div className="card-title">Paste Job Description</div>
              <textarea className="finput" rows={8} placeholder="Paste the full JD here — include responsibilities, requirements, and nice-to-haves..." value={jdText} onChange={e=>setJdText(e.target.value)} style={{resize:"vertical",lineHeight:1.7,marginBottom:"1rem"}}/>
              <button className="btn btn-primary" onClick={handleTailor} disabled={tailorLoading||!jdText.trim()}>
                {tailorLoading?"⏳ Tailoring...":"✨ Tailor My Resume"}
              </button>
            </div>
            {tailorLoading&&<div className="ai-loading"><div className="spinner" style={{width:24,height:24,borderWidth:2}}/> Groq is rewriting your bullet points for ATS optimization...</div>}
            {tailorResult && (
              <>
                <div className="card" style={{marginBottom:"1.5rem"}}>
                  <div className="card-title">ATS Score Improvement</div>
                  <div className="ats-bar-row">
                    <div className="ats-score-box before"><div className="ats-num">{tailorResult.ats_score_before}</div><div className="ats-label">Before</div></div>
                    <div style={{fontSize:"1.5rem",color:"var(--accent)",flexShrink:0}}>→</div>
                    <div className="ats-score-box after"><div className="ats-num">{tailorResult.ats_score_after}</div><div className="ats-label">After</div></div>
                    <div style={{flex:1,fontSize:13,color:"var(--muted)",lineHeight:1.6}}>
                      <strong style={{color:"var(--success)"}}>{tailorResult.ats_score_after - tailorResult.ats_score_before} point</strong> improvement. Resume now matches <strong style={{color:"var(--success)"}}>{tailorResult.ats_score_after}%</strong> of ATS requirements.
                    </div>
                  </div>
                  <div className="divider"/>
                  <div style={{marginBottom:"1rem"}}>
                    <div style={{fontSize:11,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>✅ Matched</div>
                    <div className="keyword-chips">{(tailorResult.key_matches||[]).map((k,i)=><span key={i} className="keyword-chip">{k}</span>)}</div>
                  </div>
                  {tailorResult.missing_keywords?.length>0&&(
                    <div>
                      <div style={{fontSize:11,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>❌ Still Missing</div>
                      <div className="keyword-chips">{tailorResult.missing_keywords.map((k,i)=><span key={i} className="keyword-chip missing">{k}</span>)}</div>
                    </div>
                  )}
                </div>
                {tailorResult.summary_statement&&(
                  <div className="card" style={{marginBottom:"1.5rem"}}>
                    <div className="card-title">✍️ AI Summary Statement</div>
                    <div style={{background:"var(--surface2)",borderRadius:10,padding:"1rem 1.2rem",fontSize:13,lineHeight:1.8,borderLeft:"3px solid var(--accent3)"}}>{tailorResult.summary_statement}</div>
                  </div>
                )}
                <div className="card" style={{marginBottom:"1.5rem"}}>
                  <div className="card-title">🎯 Rewritten Bullet Points</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:"1rem"}}>Copy directly into your resume — strong action verbs + JD keywords.</div>
                  <div className="bullet-list">{(tailorResult.tailored_bullets||[]).map((b,i)=><div key={i} className="bullet-item">{b}</div>)}</div>
                </div>
                {tailorResult.tips?.length>0&&(
                  <div className="card"><div className="card-title">💡 Tips</div>
                    {tailorResult.tips.map((t,i)=><div key={i} className="tip-item"><span>💡</span>{t}</div>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════ VOICE INTERVIEW ══════════════════════════════ */}
        {activeTab === "interview" && (
          <div className="feature-page">
            <div className="feature-header">
              <div className="feature-title">🎤 AI Mock Interview</div>
              <div className="feature-sub">Answer questions with your voice or text. Groq AI evaluates your answer and gives detailed feedback with a score out of 10.</div>
            </div>

            {/* Mode Toggle */}
            <div className="interview-mode-toggle">
              <button className={`mode-btn${interviewMode==="voice"?" active":""}`} onClick={()=>setInterviewMode("voice")}>🎤 Voice Mode</button>
              <button className={`mode-btn${interviewMode==="text"?" active":""}`} onClick={()=>setInterviewMode("text")}>⌨️ Text Mode</button>
            </div>

            {questions.length === 0 ? (
              <div className="card" style={{textAlign:"center",padding:"3rem 2rem"}}>
                <div style={{fontSize:"3.5rem",marginBottom:"1rem"}}>🎤</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1.3rem",marginBottom:".5rem"}}>Ready for your mock interview?</div>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:"1.5rem",lineHeight:1.7}}>
                  Groq AI will generate <strong style={{color:"var(--accent2)"}}>3 personalized questions</strong> for <strong style={{color:"var(--accent3)"}}>{analysis?.targetRole}</strong>.<br/>
                  {interviewMode==="voice"?"Speak your answers using your microphone.":"Type your answers in the text boxes."}
                </div>
                {interviewMode==="voice"&&(
                  <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:"1.5rem"}}>
                    <div className="voice-hint-chip">🎙️ Uses browser mic</div>
                    <div className="voice-hint-chip">📝 Real-time transcription</div>
                    <div className="voice-hint-chip">🧠 AI scores your answer</div>
                    <div className="voice-hint-chip">✅ Works in Chrome & Edge</div>
                  </div>
                )}
                <button className="btn btn-purple" onClick={handleGenerateQuestions} disabled={qLoading}>
                  {qLoading?"⏳ Generating questions...":"🎯 Generate My Questions"}
                </button>
              </div>
            ) : (
              <div className="voice-shell">
                {/* Question Navigator */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:".5rem",flexWrap:"wrap",gap:8}}>
                  <div className="q-nav">
                    {questions.map((_,i)=>(
                      <button key={i} className={`q-nav-btn${activeQ===i?" active":""}${evaluations[i]?" done":""}`} onClick={()=>{setActiveQ(i);setTranscript("");setInterimText("");}}>
                        Q{i+1} {evaluations[i]?"✓":""}
                      </button>
                    ))}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={handleGenerateQuestions} disabled={qLoading}>🔄 New Questions</button>
                </div>

                {/* Current Question */}
                {(() => {
                  const q = questions[activeQ];
                  const ev = evaluations[activeQ];
                  if (!q) return null;
                  return (
                    <>
                      <div className="voice-question-card">
                        <div className="vq-meta">
                          <div className="vq-num">{activeQ+1}</div>
                          <div className="vq-type">{q.type||"Technical"}</div>
                          <div className="vq-diff">{q.difficulty||"Medium"}</div>
                        </div>
                        <div className="vq-text">{q.question}</div>
                        {q.what_they_test&&<div style={{fontSize:11,color:"var(--muted)",marginTop:".8rem"}}>🔍 Tests: {q.what_they_test}</div>}
                        {q.good_answer_hints?.length>0&&(
                          <div style={{marginTop:".8rem",display:"flex",flexWrap:"wrap",gap:6}}>
                            {q.good_answer_hints.map((h,i)=><span key={i} style={{fontSize:11,padding:"3px 10px",background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.15)",borderRadius:6,color:"var(--muted)"}}>{h}</span>)}
                          </div>
                        )}
                        <div className="vq-nav">
                          {activeQ > 0 && <button className="btn btn-ghost btn-sm" onClick={()=>{setActiveQ(p=>p-1);setTranscript("");setInterimText("");}}>← Prev</button>}
                          {activeQ < questions.length-1 && <button className="btn btn-ghost btn-sm" onClick={()=>{setActiveQ(p=>p+1);setTranscript("");setInterimText("");}}>Next →</button>}
                          <div className="vq-progress">{activeQ+1} of {questions.length} questions</div>
                        </div>
                      </div>

                      {/* ── VOICE MODE ───────────────────────────────────── */}
                      {interviewMode === "voice" && (
                        <>
                          {micError && <div className="permission-error">⚠️ {micError}<br/><span style={{fontSize:11,opacity:.7}}>Voice input requires Chrome or Edge browser with mic permission enabled.</span></div>}
                          <div className="mic-area">
                            <button className={`mic-btn ${isListening?"recording":"idle"}`} onClick={isListening?stopListening:startListening} title={isListening?"Stop recording":"Start recording"}>
                              {isListening?"⏹":"🎙️"}
                            </button>
                            <div className={`mic-status${isListening?" recording":""}`}>
                              {isListening?"🔴 Recording... speak clearly":"Click the mic to start speaking"}
                            </div>
                            <div className="voice-hint">
                              <span className="voice-hint-chip">{isListening?"Speaking — click ⏹ to stop":"🎤 Chrome / Edge recommended"}</span>
                              <span className="voice-hint-chip">💡 Speak naturally, take your time</span>
                            </div>
                          </div>

                          {(transcript || interimText) && (
                            <div>
                              <div style={{fontSize:11,color:"var(--muted)",letterSpacing:1,textTransform:"uppercase",marginBottom:8}}>Your Answer (transcribed)</div>
                              <div className={`transcript-box${transcript?" has-content":""}`}>
                                {transcript}
                                {interimText && <span className="transcript-interim"> {interimText}</span>}
                                {!transcript && !interimText && <span className="transcript-placeholder">Your speech will appear here in real-time...</span>}
                              </div>
                              <div style={{display:"flex",gap:8,marginTop:".8rem",flexWrap:"wrap"}}>
                                <button className="btn btn-purple btn-sm" onClick={()=>handleEvaluate(activeQ, transcript)} disabled={evalLoading||!transcript.trim()}>
                                  {evalLoading?"⏳ Evaluating...":"🧠 Evaluate My Answer"}
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={()=>{setTranscript("");setInterimText("");}}>🗑 Clear</button>
                              </div>
                            </div>
                          )}
                          {transcript && !interimText && !ev && (
                            <button className="btn btn-purple" style={{alignSelf:"flex-start"}} onClick={()=>handleEvaluate(activeQ, transcript)} disabled={evalLoading||!transcript.trim()}>
                              {evalLoading?"⏳ Evaluating...":"🧠 Get AI Feedback →"}
                            </button>
                          )}
                        </>
                      )}

                      {/* ── TEXT MODE ─────────────────────────────────────── */}
                      {interviewMode === "text" && (
                        <>
                          <textarea className="text-answer-area" placeholder="Type your answer here... Take your time, think out loud." value={textAnswers[activeQ]||""} onChange={e=>setTextAnswers(p=>({...p,[activeQ]:e.target.value}))} rows={5}/>
                          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                            <button className="btn btn-purple btn-sm" onClick={()=>handleEvaluate(activeQ, textAnswers[activeQ])} disabled={evalLoading||!textAnswers[activeQ]?.trim()}>
                              {evalLoading?"⏳ Evaluating...":"🧠 Get AI Feedback"}
                            </button>
                          </div>
                        </>
                      )}

                      {/* Evaluation Result */}
                      {ev && <EvalCard ev={ev}/>}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ PROJECTS ════════════════════════════════════ */}
        {activeTab === "projects" && (
          <div className="feature-page">
            <div className="feature-header">
              <div className="feature-title">💡 Portfolio Project Generator</div>
              <div className="feature-sub">Get 2 specific, impressive portfolio project ideas tailored to your gaps — with step-by-step build guide and tech stack.</div>
            </div>
            {projects.length === 0 ? (
              <div className="card" style={{textAlign:"center",padding:"3rem 2rem"}}>
                <div style={{fontSize:"3rem",marginBottom:"1rem"}}>💡</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1.2rem",marginBottom:".5rem"}}>Generate your project ideas</div>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:"1.5rem",lineHeight:1.6}}>
                  AI creates <strong style={{color:"var(--accent2)"}}>2 specific projects</strong> using your skills while closing your gaps.
                </div>
                <button className="btn btn-gold" onClick={handleGenerateProjects} disabled={projLoading}>
                  {projLoading?"⏳ Generating...":"💡 Generate My Projects"}
                </button>
              </div>
            ) : (
              <>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"1rem"}}>
                  <button className="btn btn-ghost btn-sm" onClick={handleGenerateProjects} disabled={projLoading}>🔄 Regenerate</button>
                </div>
                {projects.map((p,i)=>(
                  <div key={i} className="project-card" style={{animationDelay:`${i*.1}s`}}>
                    <div className="project-header">
                      <div className="project-title">{p.title}</div>
                      <div className="project-tagline">{p.tagline}</div>
                      <div className="project-meta">
                        <span className="project-badge difficulty">⚡ {p.difficulty}</span>
                        <span className="project-badge time">⏱ {p.time_to_build}</span>
                        <span className="project-badge gap">🎯 Closes: {p.gap_it_closes}</span>
                      </div>
                    </div>
                    <div className="project-body">
                      <div style={{fontSize:12,color:"var(--muted)",marginBottom:".5rem",textTransform:"uppercase",letterSpacing:1}}>Tech Stack</div>
                      <div className="project-stack">{(p.tech_stack||[]).map((t,ti)=><span key={ti} className="stack-chip">{t}</span>)}</div>
                      <div style={{fontSize:12,color:"var(--success)",marginBottom:".8rem",padding:".6rem .8rem",background:"rgba(16,185,129,.06)",borderRadius:8,border:"1px solid rgba(16,185,129,.15)"}}>
                        🏆 {p.why_impressive}
                      </div>
                      <div style={{fontSize:12,color:"var(--muted)",marginBottom:".5rem",textTransform:"uppercase",letterSpacing:1}}>Build Steps</div>
                      <ol className="project-steps">
                        {(p.steps||[]).map((s,si)=><li key={si} className="project-step"><span className="step-num">{si+1}</span><span>{s}</span></li>)}
                      </ol>
                      {p.bonus_features?.length>0&&<div><div style={{fontSize:11,color:"var(--muted)",marginBottom:6}}>✨ Bonus Features</div><div className="bonus-chips">{p.bonus_features.map((b,bi)=><span key={bi} className="bonus-chip">+ {b}</span>)}</div></div>}
                      {p.github_readme_tip&&<div className="readme-tip"><span>📝</span><span><strong style={{color:"var(--gold)"}}>GitHub Tip:</strong> {p.github_readme_tip}</span></div>}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ════════════════════ SCHEDULE ════════════════════════════════════ */}
        {activeTab === "schedule" && (
          <div className="feature-page">
            <div className="feature-header">
              <div className="feature-title">📅 Smart Study Schedule</div>
              <div className="feature-sub">A personalized 4-week plan with daily tasks. Download as .ics to import into Google Calendar with 30-min reminders.</div>
            </div>
            {!schedule ? (
              <div className="card" style={{textAlign:"center",padding:"3rem 2rem"}}>
                <div style={{fontSize:"3rem",marginBottom:"1rem"}}>📅</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1.2rem",marginBottom:".5rem"}}>Generate your schedule</div>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:"1.5rem",lineHeight:1.6}}>
                  AI creates a <strong style={{color:"var(--accent2)"}}>4-week plan</strong> based on your gaps, with a downloadable calendar file.
                </div>
                <button className="btn btn-teal" onClick={handleGenerateSchedule} disabled={schedLoading}>
                  {schedLoading?"⏳ Building...":"📅 Generate My Schedule"}
                </button>
              </div>
            ) : (
              <>
                <div className="card" style={{marginBottom:"1.5rem",background:"linear-gradient(135deg,rgba(16,185,129,.08),rgba(6,182,212,.06))"}}>
                  <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:"1.3rem",marginBottom:".3rem"}}>{schedule.title}</div>
                  <div style={{fontSize:13,color:"var(--muted)"}}>⏱ ~{schedule.total_hours} total hours · for {analysis?.targetRole}</div>
                </div>
                {schedule.milestones?.length>0&&<div className="milestone-row">{schedule.milestones.map((m,i)=><div key={i} className="milestone"><div className="milestone-week">Week {m.week} Milestone</div><div className="milestone-goal">{m.goal}</div></div>)}</div>}
                {(schedule.weeks||[]).map((w,wi)=>(
                  <div key={wi} className="week-card">
                    <div className="week-header" onClick={()=>setOpenWeeks(p=>p.includes(wi)?p.filter(x=>x!==wi):[...p,wi])}>
                      <div className="week-num">W{w.week}</div>
                      <div className="week-info"><div className="week-theme">{w.theme}</div><div className="week-focus">{w.focus}</div></div>
                      <div className="week-hours">{w.daily_hours}h/day</div>
                      <div style={{color:"var(--muted)",fontSize:12}}>{openWeeks.includes(wi)?"▲":"▼"}</div>
                    </div>
                    {openWeeks.includes(wi)&&(
                      <div className="week-tasks">
                        {(w.tasks||[]).map((t,ti)=>(
                          <div key={ti} className={`task-item ${t.type||"course"}`}>
                            <div style={{fontSize:"1.1rem",flexShrink:0}}>{t.type==="project"?"🏗️":t.type==="practice"?"💪":"📚"}</div>
                            <div style={{flex:1}}>
                              <div className="task-title">{t.title}</div>
                              <div className="task-desc">{t.description}</div>
                              <div className="task-dur">⏱ {t.duration_hours}h · Day {t.day_offset}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {icsData&&(
                  <div className="ics-cta">
                    <div style={{fontSize:"2rem"}}>📲</div>
                    <div className="ics-text">
                      <div className="ics-title">Add to Your Calendar</div>
                      <div className="ics-sub">Import into Google Calendar, Apple Calendar or Outlook. All tasks appear as events with 30-min reminders.</div>
                    </div>
                    <button className="btn btn-teal" onClick={downloadIcs}>⬇ Download .ics</button>
                  </div>
                )}
                <div style={{textAlign:"center",marginTop:"1.5rem"}}>
                  <button className="btn btn-ghost btn-sm" onClick={handleGenerateSchedule} disabled={schedLoading}>🔄 Regenerate</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ════════════════════ ROADMAP ══════════════════════════════════════ */}
        {activeTab === "roadmap" && (()=>{
          const phaseConfig = {
            immediate:{icon:"🚀",checks:["Identify top 2 critical gaps","Enroll in a structured course","Dedicate 2hrs daily","Complete first project"]},
            short:    {icon:"🏗️",checks:["Build 2-3 portfolio projects","Push to GitHub with README","Contribute to open source","Get peer reviews"]},
            long:     {icon:"🎯",checks:["Apply to 10 companies/week","Prepare for interviews","Expand LinkedIn","Negotiate and accept"]},
          };
          const progress = Math.round((gap?.matchScore||0)*0.7);
          return (
            <div className="roadmap">
              <div className="rm-header">
                <div className="rm-title">Your Path to <span style={{background:"linear-gradient(135deg,#60a5fa,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{analysis?.targetRole}</span></div>
                <p className="rm-sub">A personalized {gap?.roadmap?.length||3}-phase plan to get hired</p>
              </div>
              <div className="rm-progress">
                <div className="rm-prog-label">Journey Progress</div>
                <div className="rm-prog-track"><div className="rm-prog-fill" style={{width:`${progress}%`}}/></div>
                <div className="rm-prog-pct" style={{color:progress>=70?"#10b981":progress>=40?"#f59e0b":"#ef4444"}}>{progress}%</div>
                <div className="rm-phases">
                  {[["#ef4444","Immediate"],["#f59e0b","Short-term"],["#10b981","Long-term"]].map(([c,l])=>(
                    <div className="rm-phase-dot" key={l}><span style={{background:c}}/>{l}</div>
                  ))}
                </div>
              </div>
              <div className="rm-phases-stack">
                {(gap?.roadmap||[]).map((step,i)=>{
                  const type = step.type||(i===0?"immediate":i===1?"short":"long");
                  const cfg  = phaseConfig[type]||phaseConfig.long;
                  return (
                    <div key={i} className="phase-card">
                      <div className={`phase-top ${type}`}>
                        <div className="phase-num">{step.step||i+1}</div>
                        <div className="phase-info"><div className="phase-timeframe">{step.timeframe}</div><div className="phase-title">{step.title}</div></div>
                        <div style={{fontSize:"2rem",opacity:.5,flexShrink:0}}>{cfg.icon}</div>
                      </div>
                      <div className="phase-body">
                        <div className="phase-desc">{step.description}</div>
                        <div className="phase-checks">{cfg.checks.map((c,ci)=><div key={ci} className="phase-check"><div className="check-box">✓</div><span>{c}</span></div>)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1.1rem",marginBottom:"1rem",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:3,height:16,background:"var(--accent)",borderRadius:2}}/>📚 Recommended Courses
              </div>
              <div className="courses-grid" style={{marginBottom:"2rem"}}>
                {(gap?.courses||[]).map((c,i)=>(
                  <div key={i} className="course2">
                    <div className="course2-plat">{c.platform}</div>
                    <div className="course2-title">{c.title}</div>
                    <div className="course2-meta">{c.why}</div>
                    {c.url&&<a href={c.url} target="_blank" rel="noopener noreferrer" className="course2-link">🔗 Start Course →</a>}
                  </div>
                ))}
              </div>
              <div className="rm-cta">
                <div className="rm-cta-emoji">💬</div>
                <div className="rm-cta-title">Have questions about your roadmap?</div>
                <div className="rm-cta-sub">Your AI mentor can give personalized advice on any step</div>
                <button className="btn btn-primary" onClick={()=>setActiveTab("chat")}>Chat with AI Mentor →</button>
              </div>
            </div>
          );
        })()}

        {/* ════════════════════ LIVE JOBS ════════════════════════════════════ */}
        {activeTab === "jobs" && (
          <div className="jobs-page">
            <div className="jobs-header">
              <div className="feature-title">💼 Live Job Matches</div>
              <div className="feature-sub">Real job openings matched to your profile. Click Apply to go directly to the job posting.</div>
            </div>

            <div className="jobs-filter">
              <div className="jobs-filter-label">📍 Location:</div>
              <div className="tags" style={{margin:0}}>
                {["India","Bangalore","Hyderabad","Mumbai","Remote","USA"].map(l=>(
                  <div key={l} className={`tag${jobLocation===l?" sel":""}`} onClick={()=>setJobLocation(l)}>{l}</div>
                ))}
              </div>
            </div>

            {!jobsLoaded ? (
              <div className="card" style={{textAlign:"center",padding:"3rem 2rem"}}>
                <div style={{fontSize:"3rem",marginBottom:"1rem"}}>💼</div>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:"1.2rem",marginBottom:".5rem"}}>Find Jobs Matching Your Profile</div>
                <div style={{fontSize:13,color:"var(--muted)",marginBottom:"1.5rem",lineHeight:1.7}}>
                  We'll find <strong style={{color:"var(--accent2)"}}>{analysis?.targetRole}</strong> openings matched to your skills.<br/>
                  <span style={{fontSize:11}}>Tip: Add Adzuna API keys to your .env for 100% real live job data.</span>
                </div>
                <button className="btn btn-rose" onClick={handleFindJobs} disabled={jobsLoading}>
                  {jobsLoading?"⏳ Searching...":"🔍 Find My Jobs"}
                </button>
              </div>
            ) : (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem",flexWrap:"wrap",gap:8}}>
                  <div style={{fontSize:13,color:"var(--muted)"}}>
                    <span className="live-dot"/>
                    {jobs.length} {analysis?.targetRole} roles found · {jobLocation} · sorted by match
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={handleFindJobs} disabled={jobsLoading}>🔄 Refresh</button>
                </div>

                {jobs.length === 0 ? (
                  <div className="jobs-empty">
                    <div style={{fontSize:"2rem",marginBottom:".8rem"}}>😕</div>
                    <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,marginBottom:".4rem"}}>No jobs found</div>
                    <div style={{fontSize:13,color:"var(--muted)"}}>Try changing location or check your API keys.</div>
                  </div>
                ) : (
                  <div className="jobs-grid">
                    {jobs.map((job,i)=>{
                      const matchCls = job.match>=85?"high":job.match>=70?"med":"low";
                      return (
                        <div key={i} className="job-card" style={{animationDelay:`${i*.07}s`}}>
                          <div className="job-inner">
                            <div className="job-logo">{job.logo||"🏢"}</div>
                            <div className="job-info">
                              <div className="job-title">{job.title}</div>
                              <div className="job-company">{job.company}</div>
                              <div className="job-tags">
                                <span className="job-tag loc">📍 {job.location}</span>
                                <span className="job-tag type">{job.type}</span>
                                {job.salary&&<span className="job-tag salary">💰 {job.salary}</span>}
                                <span className="job-tag posted">🕐 {job.posted}</span>
                              </div>
                              {job.skills_matched?.length>0&&(
                                <div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>
                                  {job.skills_matched.map((s,si)=><span key={si} style={{fontSize:10,padding:"2px 7px",background:"rgba(139,92,246,.1)",border:"1px solid rgba(139,92,246,.2)",borderRadius:4,color:"var(--accent3)"}}>{s}</span>)}
                                </div>
                              )}
                            </div>
                            <div className="job-right">
                              <div className={`match-badge ${matchCls}`}>
                                {job.match}% match
                              </div>
                              <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="apply-btn">
                                Apply Now ↗
                              </a>
                            </div>
                          </div>
                          {job.description&&<div style={{fontSize:11,color:"var(--muted)",padding:"0 1.8rem .8rem",lineHeight:1.6}}>{job.description}</div>}
                          <div className="job-source">{job.source==="adzuna"?"⚡ Live from Adzuna":"📊 AI-matched opening"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {jobs.some(j=>j.source==="mock")&&(
                  <div style={{marginTop:"1.5rem",background:"rgba(59,130,246,.06)",border:"1px solid rgba(59,130,246,.15)",borderRadius:12,padding:"1rem 1.2rem",fontSize:12,color:"var(--muted)",lineHeight:1.7}}>
                    💡 <strong style={{color:"var(--accent)"}}>Showing AI-matched job database.</strong> For live real-time job data, add your free <a href="https://developer.adzuna.com" target="_blank" rel="noopener noreferrer" style={{color:"var(--accent2)"}}>Adzuna API keys</a> to <code style={{color:"var(--accent3)"}}>ADZUNA_APP_ID</code> and <code style={{color:"var(--accent3)"}}>ADZUNA_APP_KEY</code> in your .env file.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════════════════════ CHAT ════════════════════════════════════════ */}
        {activeTab === "chat" && (
          <div className="chat-shell">
            <div className="chat-msgs">
              {messages.map((m,i)=>(
                <div key={i} className={`msg${m.role==="user"?" user":""}`}>
                  <div className={`avatar ${m.role==="ai"?"ai":"user"}`}>{m.role==="ai"?"✦":"👤"}</div>
                  <div className={`bubble ${m.role==="ai"?"ai":"user"}`} dangerouslySetInnerHTML={{__html:fmt(m.content)}}/>
                </div>
              ))}
              {chatLoading&&<div className="msg"><div className="avatar ai">✦</div><div className="bubble ai"><div className="typing"><div className="td"/><div className="td"/><div className="td"/></div></div></div>}
              <div ref={chatEnd}/>
            </div>
            <div className="chat-footer">
              <div className="quick-qs">{QUICK_QUESTIONS.map(q=><button key={q} className="quick-q" onClick={()=>sendChat(q)}>{q}</button>)}</div>
              <div className="input-row">
                <textarea className="chat-in" placeholder="Ask your AI mentor anything..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat()}}} rows={1}/>
                <button className="send-btn" onClick={()=>sendChat()} disabled={chatLoading||!chatInput.trim()}>→</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div></>
  );
}