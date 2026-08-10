<!DOCTYPE html>
<html lang="fr" data-theme="light">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>SPF Generator — DNS Toolbox</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet"/>
<style>
  [data-theme="dark"] {
    --bg:#080b12; --panel-bg:rgba(255,255,255,0.03); --glass-border:rgba(255,255,255,0.08);
    --text:#e8edf5; --muted:#4a5568; --muted2:#2d3748;
    --h1-from:#ffffff; --h1-to:rgba(255,255,255,0.45);
    --kbd-bg:rgba(255,255,255,0.06); --toggle-bg:rgba(255,255,255,0.06);
    --toggle-border:rgba(255,255,255,0.1); --toggle-text:#94a3b8;
    --blob1:rgba(79,142,247,0.12); --blob2:rgba(0,229,160,0.08);
    --shadow-panel:none; --surface:rgba(255,255,255,0.02);
  }
  [data-theme="light"] {
    --bg:#f0f4f8; --panel-bg:rgba(255,255,255,0.9); --glass-border:rgba(0,0,0,0.08);
    --text:#1a202c; --muted:#64748b; --muted2:#94a3b8;
    --h1-from:#1a202c; --h1-to:rgba(30,40,60,0.6);
    --kbd-bg:rgba(0,0,0,0.06); --toggle-bg:rgba(0,0,0,0.05);
    --toggle-border:rgba(0,0,0,0.1); --toggle-text:#64748b;
    --blob1:rgba(79,142,247,0.08); --blob2:rgba(0,229,160,0.06);
    --shadow-panel:0 4px 24px rgba(0,0,0,0.07); --surface:rgba(255,255,255,0.6);
  }
  :root {
    --blue:#4f8ef7; --cyan:#00d4ff; --green:#00c48a;
    --red:#ef4444; --amber:#f59e0b; --orange:#f97316;
    --purple:#8b5cf6; --pink:#ec4899; --teal:#14b8a6;
    --mono:'DM Mono',monospace; --sans:'Outfit',sans-serif;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{transition:background .35s,color .35s;}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:3rem 1.5rem 4rem;position:relative;overflow-x:hidden;}
  .blob{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0;}
  .blob-1{width:600px;height:600px;background:radial-gradient(circle,var(--blob1) 0%,transparent 70%);top:-200px;left:-200px;animation:float1 12s ease-in-out infinite;}
  .blob-2{width:500px;height:500px;background:radial-gradient(circle,var(--blob2) 0%,transparent 70%);bottom:-100px;right:-100px;animation:float2 15s ease-in-out infinite;}
  @keyframes float1{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,30px)}}
  @keyframes float2{0%,100%{transform:translate(0,0)}50%{transform:translate(-30px,-40px)}}
  .container{width:100%;max-width:1400px;position:relative;z-index:1;animation:fadeUp .6s ease both;}
  @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

  /* TOPBAR */
  .topbar{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:2rem;flex-wrap:wrap;gap:1rem;}
  .header-left{flex:1;min-width:260px;}
  .eyebrow{display:inline-flex;align-items:center;gap:.5rem;font-size:.72rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--blue);margin-bottom:.75rem;}
  .dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 10px var(--green);animation:pulse 2s ease infinite;}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  h1{font-family:var(--sans);font-size:clamp(1.9rem,4vw,2.8rem);font-weight:800;line-height:1.1;letter-spacing:-.03em;background:linear-gradient(135deg,var(--h1-from) 30%,var(--h1-to));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
  .subtitle{margin-top:.5rem;font-size:.875rem;color:var(--muted);font-weight:400;}
  .theme-toggle{display:flex;align-items:center;gap:.6rem;background:var(--toggle-bg);border:1px solid var(--toggle-border);border-radius:100px;padding:.35rem .5rem .35rem .8rem;cursor:pointer;font-family:var(--sans);font-size:.72rem;font-weight:600;color:var(--toggle-text);transition:all .2s;user-select:none;flex-shrink:0;align-self:flex-start;}
  .theme-toggle:hover{border-color:var(--blue);color:var(--blue);}
  .toggle-track{width:38px;height:20px;border-radius:100px;background:var(--muted2);position:relative;transition:background .3s;flex-shrink:0;}
  [data-theme="light"] .toggle-track{background:var(--blue);}
  .toggle-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.4,0,.2,1);box-shadow:0 1px 4px rgba(0,0,0,.2);}
  [data-theme="light"] .toggle-thumb{transform:translateX(18px);}

  /* ══ MAIN NAV ══ */
  .main-nav{display:flex;gap:.5rem;margin-bottom:1.5rem;flex-wrap:wrap;}
  .mnav-btn{
    display:flex;align-items:center;gap:.55rem;
    font-family:var(--sans);font-size:.82rem;font-weight:700;
    cursor:pointer;border-radius:12px;padding:.65rem 1.3rem;
    border:1px solid var(--glass-border);
    background:var(--panel-bg);color:var(--muted);
    transition:all .22s;letter-spacing:.01em;
    box-shadow:var(--shadow-panel);
  }
  .mnav-btn:hover{color:var(--text);}
  .mnav-btn .arrow{font-size:.65rem;transition:transform .25s;margin-left:.1rem;opacity:.5;}
  .mnav-btn.open .arrow{transform:rotate(180deg);opacity:1;}
  .mnav-btn.open{border-color:var(--c,var(--glass-border));color:var(--c,var(--text));background:var(--surface);}
  .mnav-dot{width:8px;height:8px;border-radius:50%;background:var(--c,var(--muted));flex-shrink:0;}
  .mnav-tag{font-family:var(--mono);font-size:.58rem;padding:.12rem .38rem;border-radius:3px;font-weight:700;background:var(--ct,rgba(0,0,0,.06));color:var(--c,var(--muted));}

  /* SUB-NAV (appears below button group) */
  .sub-nav-wrap{display:none;width:100%;margin-bottom:1.25rem;animation:fadeUp .2s ease both;}
  .sub-nav-wrap.open{display:flex;}
  .sub-nav{display:flex;gap:.4rem;background:var(--surface);border:1px solid var(--glass-border);border-radius:10px;padding:.3rem;width:fit-content;}
  .snav-btn{font-family:var(--sans);font-size:.76rem;font-weight:600;cursor:pointer;border:1px solid transparent;border-radius:7px;padding:.48rem 1rem;display:inline-flex;align-items:center;gap:.4rem;transition:all .2s;background:transparent;color:var(--muted);white-space:nowrap;}
  .snav-btn:hover{color:var(--text);}
  .snav-btn.active{background:var(--panel-bg);color:var(--c,var(--text));border-color:var(--cb,transparent);box-shadow:var(--shadow-panel);}
  .snav-dot{width:6px;height:6px;border-radius:50%;background:var(--c,var(--muted));}

  /* CONTENT PANES */
  .pane{display:none;animation:fadeUp .25s ease both;}
  .pane.active{display:block;}

  /* STATS */
  .stats-bar{display:flex;gap:.5rem;align-items:center;margin-bottom:1.1rem;flex-wrap:wrap;}
  .stat-pill{background:var(--panel-bg);border:1px solid var(--glass-border);border-radius:100px;padding:.25rem .7rem;font-size:.67rem;font-family:var(--mono);color:var(--muted);display:flex;align-items:center;gap:.3rem;box-shadow:var(--shadow-panel);}
  .stat-pill .val{font-weight:500;}

  /* LAYOUT */
  .layout{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;}
  @media(max-width:640px){.layout{grid-template-columns:1fr;}}

  /* PANEL */
  .panel{background:var(--panel-bg);border:1px solid var(--glass-border);border-radius:16px;overflow:hidden;display:flex;flex-direction:column;backdrop-filter:blur(16px);transition:border-color .3s,background .35s,box-shadow .35s;box-shadow:var(--shadow-panel);}
  .panel:focus-within{border-color:rgba(79,142,247,.3);}
  .panel-header{padding:.9rem 1.25rem .7rem;border-bottom:1px solid var(--glass-border);display:flex;align-items:center;justify-content:space-between;}
  .panel-title{font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:.5rem;}
  .lc{font-family:var(--mono);font-size:.63rem;color:var(--muted);background:var(--surface);border:1px solid var(--glass-border);padding:.18rem .45rem;border-radius:4px;transition:all .2s;}
  .lc.active{color:var(--blue);background:rgba(79,142,247,.1);border-color:rgba(79,142,247,.2);}

  /* INPUTS */
  textarea{flex:1;width:100%;background:transparent;border:none;color:var(--text);font-family:var(--mono);font-size:.8rem;padding:.9rem 1.25rem;resize:none;outline:none;line-height:1.9;letter-spacing:.01em;transition:color .3s;}
  textarea::placeholder{color:var(--muted2);}
  .input-section{display:flex;flex-direction:column;flex:1;}
  .field-block{display:flex;flex-direction:column;}
  .field-block+.field-block{border-top:1px solid var(--glass-border);}
  .flb{display:flex;align-items:center;justify-content:space-between;padding:.6rem 1.25rem .3rem;}
  .fl{font-size:.63rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);}
  .ft{font-family:var(--mono);font-size:.6rem;padding:.12rem .42rem;border-radius:4px;font-weight:600;}
  .hint-text{font-size:.65rem;color:var(--muted2);font-family:var(--mono);padding:0 1.25rem .65rem;}
  .hint-text span{color:var(--amber);}

  /* OUTPUT */
  .output-body{flex:1;padding:1rem 1.25rem;min-height:280px;font-family:var(--mono);font-size:.8rem;line-height:1.9;overflow-x:auto;overflow-y:auto;}
  #pane-cleaner .output-body{min-height:unset;height:200px;max-height:200px;overflow-y:auto;}
  .output-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.5rem;color:var(--muted2);font-size:.78rem;min-height:240px;text-align:center;font-family:var(--sans);}
  .output-empty svg{opacity:.2;margin-bottom:.4rem;}
  .output-line{display:flex;align-items:flex-start;gap:.55rem;padding:.12rem 0;animation:lineIn .22s ease both;white-space:nowrap;min-width:max-content;}
  @keyframes lineIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
  .output-line.ok .line-text{color:var(--green);}
  .output-line.err .line-text{color:var(--red);font-style:italic;font-size:.72rem;white-space:normal;}
  .output-line.warn .line-text{color:var(--amber);}
  .line-num{font-size:.6rem;color:var(--muted2);min-width:18px;text-align:right;margin-top:3px;user-select:none;flex-shrink:0;}
  .line-icon{font-size:.63rem;flex-shrink:0;margin-top:3px;}
  .line-text{word-break:normal;white-space:nowrap;flex:1;}

  .error-banner{display:none;margin:0 1.25rem .6rem;padding:.55rem .85rem;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:8px;font-size:.71rem;color:#f87171;align-items:center;gap:.5rem;font-family:var(--sans);}
  .error-banner.show{display:flex;}

  /* BUTTONS */
  .panel-footer{padding:.8rem 1.25rem;border-top:1px solid var(--glass-border);display:flex;align-items:center;gap:.6rem;}
  button{font-family:var(--sans);font-weight:600;font-size:.78rem;cursor:pointer;border:none;border-radius:8px;padding:.58rem 1.05rem;transition:all .18s;display:inline-flex;align-items:center;gap:.4rem;white-space:nowrap;}
  button:active{transform:translateY(0)!important;}
  .btn-blue{background:linear-gradient(135deg,var(--blue),#6fa3ff);color:#fff;box-shadow:0 4px 20px rgba(79,142,247,.25);flex:1;}
  .btn-blue:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(79,142,247,.4);}
  .btn-orange{background:linear-gradient(135deg,var(--orange),#fbbf24);color:#fff;box-shadow:0 4px 20px rgba(249,115,22,.25);flex:1;}
  .btn-orange:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(249,115,22,.4);}
  .btn-purple{background:linear-gradient(135deg,var(--purple),#a78bfa);color:#fff;box-shadow:0 4px 20px rgba(139,92,246,.25);flex:1;}
  .btn-purple:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(139,92,246,.4);}
  .btn-pink{background:linear-gradient(135deg,var(--pink),#f472b6);color:#fff;box-shadow:0 4px 20px rgba(236,72,153,.25);flex:1;}
  .btn-pink:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(236,72,153,.4);}
  .btn-teal{background:linear-gradient(135deg,var(--teal),#2dd4bf);color:#fff;box-shadow:0 4px 20px rgba(20,184,166,.25);flex:1;}
  .btn-teal:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(20,184,166,.4);}
  .btn-clear{background:var(--surface);border:1px solid var(--glass-border);color:var(--muted);padding:.58rem .82rem;}
  .btn-clear:hover{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.3);color:var(--red);}
  .btn-copy{background:rgba(0,196,138,.07);border:1px solid rgba(0,196,138,.2);color:var(--green);flex:1;}
  .btn-copy:hover{background:rgba(0,196,138,.14);transform:translateY(-1px);}
  .btn-copy.copied{background:rgba(0,196,138,.18);border-color:rgba(0,196,138,.5);}
  .btn-copy-disabled{opacity:.3;pointer-events:none;}
  .shortcut-hint{font-size:.61rem;color:var(--muted2);font-family:var(--mono);margin-left:auto;}
  kbd{background:var(--kbd-bg);border:1px solid var(--glass-border);border-radius:3px;padding:.1rem .32rem;font-size:.6rem;font-family:var(--mono);}

  /* CLEANER SPECIFIC */
  .tab-clean{display:none;animation:fadeUp .25s ease both;}
  .tab-clean.active{display:block;}
  .cleaner-mode-bar{display:flex;align-items:center;gap:.4rem;padding:.6rem 1.25rem .45rem;border-bottom:1px solid var(--glass-border);flex-wrap:wrap;}
  .cmode-label{font-size:.6rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-right:.2rem;}
  .cmode-btn{font-family:var(--sans);font-size:.71rem;font-weight:600;cursor:pointer;border:1px solid var(--glass-border);border-radius:6px;padding:.28rem .7rem;background:transparent;color:var(--muted);transition:all .2s;}
  .cmode-btn:hover{color:var(--text);}
  .cmode-btn.active{background:rgba(20,184,166,.09);border-color:rgba(20,184,166,.35);color:var(--teal);}
  .clean-summary{margin:.5rem 1.25rem .1rem;padding:.45rem .8rem;border-radius:8px;font-size:.68rem;font-family:var(--mono);background:rgba(20,184,166,.06);border:1px solid rgba(20,184,166,.15);color:var(--teal);display:none;}
  .clean-summary.show{display:block;}
  .limit-banner{display:none;margin:0 1.25rem .5rem;padding:.42rem .8rem;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.25);border-radius:8px;font-size:.68rem;color:var(--amber);font-family:var(--sans);}
  .limit-banner.show{display:flex;align-items:center;gap:.4rem;}

  /* FOOTER */
  .footer{margin-top:2.5rem;text-align:center;font-family:var(--sans);font-size:.72rem;color:var(--muted);letter-spacing:.05em;position:relative;z-index:1;}
  .footer span{color:var(--blue);font-weight:700;}
</style>
</head>
<body>
<div class="blob blob-1"></div>
<div class="blob blob-2"></div>
<div class="container">

  <!-- TOPBAR -->
  <div class="topbar">
    <div class="header-left">
      <div class="eyebrow"><div class="dot"></div> DNS Toolbox</div>
      <h1>SPF Record Generator CMH9 </h1>
      <p class="subtitle">Générez des enregistrements SPF ou nettoyez vos listes d'IPs et domaines.</p>
    </div>
    <button class="theme-toggle" onclick="toggleTheme()">
      <span id="toggleIcon">☀️</span><span id="toggleLabel">Light</span>
      <div class="toggle-track"><div class="toggle-thumb"></div></div>
    </button>
  </div>

  <!-- MAIN NAV -->
  <div class="main-nav">
    <!-- Include -->
    <button class="mnav-btn" id="mn-include" onclick="toggleMenu('include')" style="--c:var(--blue);--ct:rgba(79,142,247,0.12)">
      <div class="mnav-dot"></div>
      Include
      <span class="mnav-tag">include:</span>
      <span class="arrow">▾</span>
    </button>
    <!-- Record A -->
    <button class="mnav-btn" id="mn-recorda" onclick="toggleMenu('recorda')" style="--c:var(--purple);--ct:rgba(139,92,246,0.12)">
      <div class="mnav-dot" style="background:var(--purple)"></div>
      Record A
      <span class="mnav-tag" style="background:rgba(139,92,246,0.12);color:var(--purple)">a:</span>
      <span class="arrow">▾</span>
    </button>
    <!-- Cleaner -->
    <button class="mnav-btn" id="mn-cleaner" onclick="toggleMenu('cleaner')" style="--c:var(--teal);--ct:rgba(20,184,166,0.12)">
      <div class="mnav-dot" style="background:var(--teal)"></div>
      Cleaner
      <span class="mnav-tag" style="background:rgba(20,184,166,0.12);color:var(--teal)">✦</span>
      <span class="arrow">▾</span>
    </button>
  </div>

  <!-- SUB NAV Include -->
  <div class="sub-nav-wrap" id="sub-include">
    <div class="sub-nav">
      <button class="snav-btn active" id="sn-id" onclick="switchPane('id')" style="--c:var(--blue);--cb:rgba(79,142,247,0.2)">
        <div class="snav-dot"></div> Mode Domaines
      </button>
      <button class="snav-btn" id="sn-ii" onclick="switchPane('ii')" style="--c:var(--orange);--cb:rgba(249,115,22,0.2)">
        <div class="snav-dot" style="background:var(--orange)"></div> Mode IP
      </button>
    </div>
  </div>

  <!-- SUB NAV Record A -->
  <div class="sub-nav-wrap" id="sub-recorda">
    <div class="sub-nav">
      <button class="snav-btn active" id="sn-ri" onclick="switchPane('ri')" style="--c:var(--pink);--cb:rgba(236,72,153,0.2)">
        <div class="snav-dot" style="background:var(--pink)"></div> Mode IP
      </button>
    </div>
  </div>

  <!-- SUB NAV Cleaner (no sub-tabs, just opens pane) -->
  <div class="sub-nav-wrap" id="sub-cleaner" style="display:none"></div>

  <!-- ══════════════ PANES ══════════════ -->

  <!-- INCLUDE / DOMAINES -->
  <div class="pane active" id="pane-id">
    <div class="stats-bar">
      <div class="stat-pill"><span class="val" id="id-sl">0</span>&nbsp;lignes</div>
      <div class="stat-pill"><span class="val" id="id-sok" style="color:var(--green)">0</span>&nbsp;<span style="color:var(--green)">OK</span></div>
      <div class="stat-pill"><span class="val" id="id-ser" style="color:var(--red)">0</span>&nbsp;<span style="color:var(--red)">erreurs</span></div>
    </div>
    <div class="layout">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">⬤ Entrée</div>
          <span class="lc" id="id-ic">0 ligne(s)</span>
        </div>
        <textarea id="id-in" placeholder="domain1,domain2,domain_central&#10;domain3,domain4,domain_hub" spellcheck="false" style="min-height:300px"></textarea>
        <div class="hint-text">Format : <span>domain1,domain2,domain_central</span></div>
        <div class="panel-footer">
          <button class="btn-blue" onclick="genDom('id','include')">▶ Générer</button>
          <button class="btn-clear" onclick="clrDom('id')" title="Effacer">🗑</button>
          <span class="shortcut-hint"><kbd>Ctrl</kbd>+<kbd>↵</kbd></span>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">⬤ Résultat</div><span class="lc" id="id-oc">0 ligne(s)</span></div>
        <div class="error-banner" id="id-eb"><span id="id-ebt"></span></div>
        <div class="output-body" id="id-out">EMPTY</div>
        <div class="panel-footer">
          <button class="btn-copy btn-copy-disabled" id="id-cb" onclick="doCopy('id')">⎘ <span id="id-cl">Copier tout</span></button>
        </div>
      </div>
    </div>
  </div>

  <!-- INCLUDE / IP -->
  <div class="pane" id="pane-ii">
    <div class="stats-bar">
      <div class="stat-pill"><span class="val" id="ii-sd" style="color:var(--blue)">0</span>&nbsp;<span style="color:var(--blue)">domaine(s)</span></div>
      <div class="stat-pill"><span class="val" id="ii-si" style="color:var(--orange)">0</span>&nbsp;<span style="color:var(--orange)">IP(s)</span></div>
      <div class="stat-pill"><span class="val" id="ii-sok" style="color:var(--green)">0</span>&nbsp;<span style="color:var(--green)">OK</span></div>
      <div class="stat-pill"><span class="val" id="ii-ser" style="color:var(--red)">0</span>&nbsp;<span style="color:var(--red)">erreurs</span></div>
    </div>
    <div class="layout">
      <div class="panel">
        <div class="panel-header"><div class="panel-title">⬤ Entrée</div></div>
        <div class="input-section">
          <div class="field-block">
            <div class="flb"><span class="fl">Domaine(s) central</span><span class="ft" id="ii-dc" style="background:rgba(79,142,247,.1);color:var(--blue)">0 domaine(s)</span></div>
            <textarea id="ii-dom" placeholder="example.com&#10;company.org" spellcheck="false" style="min-height:100px"></textarea>
            <div class="hint-text">Un domaine par ligne</div>
          </div>
          <div class="field-block">
            <div class="flb"><span class="fl">Adresses IP</span><span class="ft" id="ii-ic" style="background:rgba(249,115,22,.1);color:var(--orange)">0 / 100</span></div>
            <textarea id="ii-ip" placeholder="192.168.1.1&#10;10.0.0.1" spellcheck="false" style="min-height:160px"></textarea>
            <div class="hint-text">Une IP par ligne <span>(max 100)</span></div>
          </div>
        </div>
        <div class="panel-footer">
          <button class="btn-orange" onclick="genIP('ii','include',100)">▶ Générer</button>
          <button class="btn-clear" onclick="clrIP('ii',100)" title="Effacer">🗑</button>
          <span class="shortcut-hint"><kbd>Ctrl</kbd>+<kbd>↵</kbd></span>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">⬤ Résultat</div><span class="lc" id="ii-oc">0 ligne(s)</span></div>
        <div class="error-banner" id="ii-eb"><span id="ii-ebt"></span></div>
        <div class="output-body" id="ii-out">EMPTY</div>
        <div class="panel-footer">
          <button class="btn-copy btn-copy-disabled" id="ii-cb" onclick="doCopy('ii')">⎘ <span id="ii-cl">Copier tout</span></button>
        </div>
      </div>
    </div>
  </div>

  <!-- RECORD A / IP -->
  <div class="pane" id="pane-ri">
    <div class="stats-bar">
      <div class="stat-pill"><span class="val" id="ri-sd" style="color:var(--purple)">0</span>&nbsp;<span style="color:var(--purple)">ligne(s) domaine</span></div>
      <div class="stat-pill"><span class="val" id="ri-si" style="color:var(--pink)">0</span>&nbsp;<span style="color:var(--pink)">IP(s)</span></div>
      <div class="stat-pill"><span class="val" id="ri-sok" style="color:var(--green)">0</span>&nbsp;<span style="color:var(--green)">OK</span></div>
      <div class="stat-pill"><span class="val" id="ri-ser" style="color:var(--red)">0</span>&nbsp;<span style="color:var(--red)">erreurs</span></div>
    </div>
    <div class="layout">
      <div class="panel">
        <div class="panel-header"><div class="panel-title">⬤ Entrée</div></div>
        <div class="input-section">
          <div class="field-block">
            <div class="flb"><span class="fl">Domaine central</span><span class="ft" id="ri-dc" style="background:rgba(139,92,246,.1);color:var(--purple)">0 ligne(s)</span></div>
            <textarea id="ri-dom" placeholder="domain.com,domain.com&#10;domain.com,subdom.domain.com" spellcheck="false" style="min-height:100px"></textarea>
            <div class="hint-text">Format obligatoire : <span>domain,domain</span> ou <span>domain,subdom.domain</span></div>
          </div>
          <div class="field-block">
            <div class="flb"><span class="fl">Adresses IP</span><span class="ft" id="ri-ic" style="background:rgba(236,72,153,.1);color:var(--pink)">0 / 50</span></div>
            <textarea id="ri-ip" placeholder="192.168.1.1&#10;10.0.0.1" spellcheck="false" style="min-height:160px"></textarea>
            <div class="hint-text">Une IP par ligne <span>(max 50)</span></div>
          </div>
        </div>
        <div class="panel-footer">
          <button class="btn-pink" onclick="genIP('ri','recorda',50)">▶ Générer</button>
          <button class="btn-clear" onclick="clrIP('ri',50)" title="Effacer">🗑</button>
          <span class="shortcut-hint"><kbd>Ctrl</kbd>+<kbd>↵</kbd></span>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><div class="panel-title">⬤ Résultat</div><span class="lc" id="ri-oc">0 ligne(s)</span></div>
        <div class="error-banner" id="ri-eb"><span id="ri-ebt"></span></div>
        <div class="output-body" id="ri-out">EMPTY</div>
        <div class="panel-footer">
          <button class="btn-copy btn-copy-disabled" id="ri-cb" onclick="doCopy('ri')">⎘ <span id="ri-cl">Copier tout</span></button>
        </div>
      </div>
    </div>
  </div>

  <!-- CLEANER -->
  <div class="pane" id="pane-cleaner">

    <!-- Sub-nav -->
    <div class="sub-nav" id="cleaner-subnav" style="margin-bottom:1.25rem">
      <button class="snav-btn active" id="sn-cd" onclick="switchCleanerTab('cd')" style="--c:var(--teal);--cb:rgba(20,184,166,0.2)">
        <div class="snav-dot" style="background:var(--teal)"></div> Domaines
      </button>
      <button class="snav-btn" id="sn-ci" onclick="switchCleanerTab('ci')" style="--c:var(--orange);--cb:rgba(249,115,22,0.2)">
        <div class="snav-dot" style="background:var(--orange)"></div> IPs
      </button>
    </div>

    <!-- ── TAB DOMAINES ── -->
    <div class="tab-clean active" id="ctab-cd">
      <div class="stats-bar">
        <div class="stat-pill"><span class="val" id="cd-sin">0</span>&nbsp;lignes</div>
        <div class="stat-pill"><span class="val" id="cd-sout" style="color:var(--green)">0</span>&nbsp;<span style="color:var(--green)">extraits</span></div>
        <div class="stat-pill"><span class="val" id="cd-srem" style="color:var(--red)">0</span>&nbsp;<span style="color:var(--red)">ignorés</span></div>
      </div>
      <div class="layout">
        <div class="panel">
          <div class="panel-header"><div class="panel-title">🌐 Texte brut</div></div>
          <div class="cleaner-mode-bar">
            <span class="cmode-label">SOUS-DOMAINES :</span>
            <button class="cmode-btn active" id="cmode-keep" onclick="setSubMode('keep')">✔ Conserver</button>
            <button class="cmode-btn" id="cmode-strip" onclick="setSubMode('strip')">✖ Supprimer</button>
          </div>
          <textarea id="cd-in" placeholder="Collez n'importe quel texte — les domaines valides seront extraits.&#10;&#10;Exemple :&#10;blabla hondaoftomsriver.com garbage *erg&#10;sub.example.com 4e5ge9 googlehosted.co.uk text" spellcheck="false" style="height:200px;max-height:200px;overflow-y:auto"></textarea>
          <div class="panel-footer">
            <button class="btn-teal" onclick="runDomainExtract()">✦ Extraire</button>
            <button class="btn-clear" onclick="clrExtract('cd')" title="Effacer">🗑</button>
            <span class="shortcut-hint"><kbd>Ctrl</kbd>+<kbd>↵</kbd></span>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><div class="panel-title">🌐 Domaines extraits</div><span class="lc" id="cd-oc">0</span></div>
          <div class="limit-banner" id="cd-limit"></div>
          <div class="clean-summary" id="cd-sum"></div>
          <div class="output-body" id="cd-out">EMPTY</div>
          <div class="panel-footer">
            <button class="btn-copy btn-copy-disabled" id="cd-cb" onclick="copyExtract('cd')">⎘ <span id="cd-cl">Copier</span></button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── TAB IPs ── -->
    <div class="tab-clean" id="ctab-ci">
      <div class="stats-bar">
        <div class="stat-pill"><span class="val" id="ci-sin">0</span>&nbsp;lignes</div>
        <div class="stat-pill"><span class="val" id="ci-sout" style="color:var(--green)">0</span>&nbsp;<span style="color:var(--green)">extraites</span></div>
        <div class="stat-pill"><span class="val" id="ci-srem" style="color:var(--red)">0</span>&nbsp;<span style="color:var(--red)">ignorées</span></div>
      </div>
      <div class="layout">
        <div class="panel">
          <div class="panel-header"><div class="panel-title">🟠 Texte brut</div></div>
          <textarea id="ci-in" placeholder="Collez n'importe quel texte — les IPs valides seront extraites.&#10;&#10;Exemple :&#10;blabla 192.168.1.1 garbage text&#10;10.0.0.5 invalid-ip 999.0.0.1 text..." spellcheck="false" style="height:200px;max-height:200px;overflow-y:auto"></textarea>
          <div class="panel-footer">
            <button class="btn-orange" onclick="runIPExtract()">✦ Extraire</button>
            <button class="btn-clear" onclick="clrExtract('ci')" title="Effacer">🗑</button>
            <span class="shortcut-hint"><kbd>Ctrl</kbd>+<kbd>↵</kbd></span>
          </div>
        </div>
        <div class="panel">
          <div class="panel-header"><div class="panel-title">🟠 IPs extraites</div><span class="lc" id="ci-oc">0</span></div>
          <div class="limit-banner" id="ci-limit"></div>
          <div class="clean-summary" id="ci-sum"></div>
          <div class="output-body" id="ci-out">EMPTY</div>
          <div class="panel-footer">
            <button class="btn-copy btn-copy-disabled" id="ci-cb" onclick="copyExtract('ci')">⎘ <span id="ci-cl">Copier</span></button>
          </div>
        </div>
      </div>
    </div>

  </div>

</div>
<div class="footer">Created by <span>CMH9 Admin</span></div>

<script>
/* ══ THEME ══ */
const html=document.documentElement;
setTheme(localStorage.getItem('spf-theme')||'light');
function toggleTheme(){setTheme(html.getAttribute('data-theme')==='dark'?'light':'dark');}
function setTheme(t){
  html.setAttribute('data-theme',t);localStorage.setItem('spf-theme',t);
  document.getElementById('toggleIcon').textContent=t==='dark'?'🌙':'☀️';
  document.getElementById('toggleLabel').textContent=t==='dark'?'Dark':'Light';
}

/* ══ NAVIGATION ══ */
// Which pane is default per menu
const menuDefaults={include:'id',recorda:'ri',cleaner:'cleaner'};
const paneToMenu={id:'include',ii:'include',ri:'recorda',cleaner:'cleaner'};
const paneToSub={id:'sn-id',ii:'sn-ii',ri:'sn-ri'};
let activeMenu=null,activePane='id';

// Init empties
document.querySelectorAll('.output-body').forEach(o=>setEmpty(o.id));

function toggleMenu(menu){
  if(activeMenu===menu){
    // close
    document.getElementById('mn-'+menu).classList.remove('open');
    document.getElementById('sub-'+menu).classList.remove('open');
    if(menu!=='cleaner') document.getElementById('sub-'+menu).style.display='';
    document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
    activeMenu=null;
  } else {
    // close previous
    if(activeMenu){
      document.getElementById('mn-'+activeMenu).classList.remove('open');
      const prev=document.getElementById('sub-'+activeMenu);
      prev.classList.remove('open');
      if(activeMenu!=='cleaner') prev.style.display='';
    }
    activeMenu=menu;
    document.getElementById('mn-'+menu).classList.add('open');
    const sub=document.getElementById('sub-'+menu);
    sub.style.display='flex';
    sub.classList.add('open');
    // Show default pane
    switchPane(menuDefaults[menu]);
  }
}

function switchPane(pid){
  document.querySelectorAll('.pane').forEach(p=>p.classList.remove('active'));
  document.getElementById('pane-'+pid).classList.add('active');
  activePane=pid;
  // update sub-nav active
  const menu=paneToMenu[pid];
  if(menu!=='cleaner'){
    document.querySelectorAll(`#sub-${menu} .snav-btn`).forEach(b=>b.classList.remove('active'));
    const snEl=document.getElementById('sn-'+pid);
    if(snEl) snEl.classList.add('active');
  }
}

/* ══ HELPERS ══ */
const store={};
function getLines(id){return document.getElementById(id).value.split('\n').map(l=>l.trim()).filter(l=>l);}

function setEmpty(id){
  document.getElementById(id).innerHTML='<div class="output-empty"><svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M7 8h10M7 12h7M7 16h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>Le résultat apparaîtra ici</div>';
}

function isIPv4(ip){
  const p=ip.split('.');
  return p.length===4&&p.every(x=>/^\d+$/.test(x)&&+x>=0&&+x<=255&&String(+x)===x);
}

function getDups(arr){
  const s={},d=[];
  arr.forEach(v=>{const k=v.toLowerCase();s[k]=(s[k]||0)+1;if(s[k]===2)d.push(k);});
  return d;
}

function renderRows(outId,rows){
  const ob=document.getElementById(outId);ob.innerHTML='';
  rows.forEach((r,i)=>{
    const d=document.createElement('div');d.className=`output-line ${r.cls||'ok'}`;d.style.animationDelay=`${i*0.025}s`;
    if(r.num!==undefined){const n=document.createElement('span');n.className='line-num';n.textContent=r.num;d.appendChild(n);}
    const ic=document.createElement('span');ic.className='line-icon';ic.textContent=r.cls==='err'?'✕':r.cls==='warn'?'⚠':'✓';d.appendChild(ic);
    const tx=document.createElement('span');tx.className='line-text';if(r.cls==='err')tx.style.whiteSpace='normal';tx.textContent=r.text;d.appendChild(tx);
    ob.appendChild(d);
  });
}

function doCopy(p){
  const lines=store[p]||[];if(!lines.length)return;
  navigator.clipboard.writeText(lines.join('\n')).then(()=>{
    const cl=document.getElementById(p+'-cl'),cb=document.getElementById(p+'-cb');
    cl.textContent='✓ Copié!';cb.classList.add('copied');
    setTimeout(()=>{cl.textContent='Copier tout';cb.classList.remove('copied');},2200);
  });
}

function setStats(p,ok,err){
  if(document.getElementById(p+'-sok')) document.getElementById(p+'-sok').textContent=ok;
  if(document.getElementById(p+'-ser')) document.getElementById(p+'-ser').textContent=err;
}

function setOutputCount(p,n){
  const el=document.getElementById(p+'-oc');if(!el)return;
  el.textContent=`${n} ligne(s)`;el.classList.toggle('active',n>0);
}

function showEB(p,msg){const eb=document.getElementById(p+'-eb');if(!eb)return;document.getElementById(p+'-ebt').textContent=msg;eb.classList.add('show');}
function hideEB(p){const eb=document.getElementById(p+'-eb');if(eb)eb.classList.remove('show');}
function enableCopy(p,yes){document.getElementById(p+'-cb').classList.toggle('btn-copy-disabled',!yes);}

/* ══ INCLUDE / RECORD A — MODE DOMAINES ══ */
function genDom(p,mode){
  const lines=getLines(p+'-in');if(!lines.length)return;
  let ok=0,err=0;store[p]=[];
  const rows=lines.map((line,i)=>{
    const pts=line.split(',').map(x=>x.trim());
    if(pts.length!==3||pts.some(x=>!x)){err++;return{cls:'err',text:`Invalide : "${line}"`,num:i+1};}
    ok++;
    const txt=mode==='include'
      ?`${pts[0]},${pts[1]},TXT,"v=spf1 include:${pts[2]} -all"`
      :`${pts[0]},${pts[1]},TXT,"v=spf1 a:${pts[2]} -all"`;
    store[p].push(txt);return{cls:'ok',text:txt,num:i+1};
  });
  renderRows(p+'-out',rows);setStats(p,ok,err);setOutputCount(p,ok);
  err>0?showEB(p,`${err} ligne(s) ignorée(s) — format : domain1,domain2,domain_central`):hideEB(p);
  enableCopy(p,ok>0);
  document.getElementById(p+'-cl').textContent='Copier tout';document.getElementById(p+'-cb').classList.remove('copied');
}

function clrDom(p){
  document.getElementById(p+'-in').value='';setEmpty(p+'-out');store[p]=[];
  document.getElementById(p+'-ic').textContent='0 ligne(s)';document.getElementById(p+'-ic').classList.remove('active');
  setOutputCount(p,0);hideEB(p);enableCopy(p,false);
  if(document.getElementById(p+'-sl')) document.getElementById(p+'-sl').textContent=0;
  setStats(p,0,0);
}

// Live count
['id-in'].forEach(id=>{
  const el=document.getElementById(id);if(!el)return;
  const p=id.split('-')[0];
  el.addEventListener('input',()=>{
    const n=getLines(id).length;
    document.getElementById(p+'-ic').textContent=`${n} ligne(s)`;
    document.getElementById(p+'-ic').classList.toggle('active',n>0);
    if(document.getElementById(p+'-sl')) document.getElementById(p+'-sl').textContent=n;
  });
  el.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();const mode=p==='id'?'include':'recorda';genDom(p,mode);}});
});

/* ══ MODE IP — SHARED ══ */
function isValidDomainName(d){
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(d);
}

function parseRecordAPairs(lines){
  return lines.map((line,i)=>{
    const pts=line.split(',').map(x=>x.trim()).filter(Boolean);
    if(pts.length!==2) return {ok:false,line,i,msg:`Ligne ${i+1} invalide : "${line}" → format obligatoire : domain,domain ou domain,subdom.domain`};
    const [base,target]=pts;
    if(!isValidDomainName(base)) return {ok:false,line,i,msg:`Ligne ${i+1} — domaine invalide : "${base}"`};
    if(!isValidDomainName(target)) return {ok:false,line,i,msg:`Ligne ${i+1} — domaine/subdomaine invalide : "${target}"`};
    return {ok:true,base:base.toLowerCase(),target:target.toLowerCase(),raw:`${base.toLowerCase()},${target.toLowerCase()}`};
  });
}

function validateIP(p,domains,ips,maxIP,mode){
  const errs=[];
  if(!domains.length) errs.push(mode==='recorda'
    ? 'Domaine obligatoire — ajoutez au moins une ligne : domain,domain ou domain,subdom.domain.'
    : 'Domaine obligatoire — saisissez au moins un domaine central.');
  if(mode==='recorda'){
    const parsed=parseRecordAPairs(domains);
    parsed.filter(x=>!x.ok).forEach(x=>errs.push(x.msg));
    getDups(parsed.filter(x=>x.ok).map(x=>x.raw)).forEach(d=>errs.push(`Doublon domaine : "${d}" — supprimez les doublons.`));
  } else {
    getDups(domains).forEach(d=>errs.push(`Doublon domaine : "${d}" — supprimez les doublons.`));
  }
  if(!ips.length) errs.push('Aucune adresse IP saisie.');
  if(ips.length>maxIP) errs.push(`Limite dépassée : ${ips.length} IPs — maximum ${maxIP}.`);
  if(ips.length>0&&ips.length<=maxIP){
    getDups(ips).forEach(ip=>errs.push(`Doublon IP : "${ip}" — supprimez les doublons.`));
    ips.forEach((ip,i)=>{if(!isIPv4(ip))errs.push(`Ligne ${i+1} — IP invalide : "${ip}" → ex. 192.168.1.1`);});
  }
  return errs;
}

function genIP(p,mode,maxIP){
  const domains=getLines(p+'-dom'),ips=getLines(p+'-ip');
  store[p]=[];
  const errs=validateIP(p,domains,ips,maxIP,mode);
  if(errs.length){
    renderRows(p+'-out',errs.map(t=>({cls:'err',text:t})));
    setStats(p,0,errs.length);setOutputCount(p,0);hideEB(p);enableCopy(p,false);return;
  }
  const rows=[];
  if(mode==='include'){
    const ipStr=ips.map(ip=>`ip4:${ip}`).join(' ');
    domains.forEach((dom,i)=>{
      const txt=`${dom},${dom},TXT,"v=spf1 ${ipStr} -all"`;
      store[p].push(txt);rows.push({cls:'ok',text:txt,num:i+1});
    });
  } else {
    const parsed=parseRecordAPairs(domains).filter(x=>x.ok);
    parsed.forEach((item,i)=>{
      const txt=`${item.base},${item.target},TXT,Arecords:${ips.join(';')}`;
      store[p].push(txt);rows.push({cls:'ok',text:txt,num:i+1});
    });
  }
  renderRows(p+'-out',rows);setStats(p,rows.length,0);setOutputCount(p,rows.length);hideEB(p);enableCopy(p,true);
  document.getElementById(p+'-cl').textContent='Copier tout';document.getElementById(p+'-cb').classList.remove('copied');
}

function clrIP(p,maxIP){
  document.getElementById(p+'-dom').value='';document.getElementById(p+'-ip').value='';
  setEmpty(p+'-out');store[p]=[];
  document.getElementById(p+'-dc').textContent=p==='ri'?'0 ligne(s)':'0 domaine(s)';
  document.getElementById(p+'-ic').textContent=`0 / ${maxIP}`;
  document.getElementById(p+'-ic').style.color='';
  setOutputCount(p,0);hideEB(p);enableCopy(p,false);setStats(p,0,0);
  if(document.getElementById(p+'-sd')) document.getElementById(p+'-sd').textContent=0;
  if(document.getElementById(p+'-si')) document.getElementById(p+'-si').textContent=0;
}

// Live counts IP panels
[{p:'ii',max:100},{p:'ri',max:50}].forEach(({p,max})=>{
  const domEl=document.getElementById(p+'-dom');
  const ipEl=document.getElementById(p+'-ip');
  if(domEl) domEl.addEventListener('input',()=>{
    const n=getLines(p+'-dom').length;
    document.getElementById(p+'-dc').textContent=p==='ri'?`${n} ligne(s)`: `${n} domaine(s)`;
    if(document.getElementById(p+'-sd')) document.getElementById(p+'-sd').textContent=n;
  });
  if(ipEl) ipEl.addEventListener('input',()=>{
    const n=getLines(p+'-ip').length;
    const lbl=document.getElementById(p+'-ic');lbl.textContent=`${n} / ${max}`;
    lbl.style.color=n>max?'var(--red)':n>max*.9?'var(--amber)':'';
    if(document.getElementById(p+'-si')) document.getElementById(p+'-si').textContent=n;
  });
  [domEl,ipEl].forEach(el=>{if(el) el.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();
      const mode=p==='ii'?'include':'recorda';genIP(p,mode,max);}
  });});
});

/* ══ CLEANER — VERSION ILLIMITÉE ══ */
let subMode = 'keep';

function switchCleanerTab(tab) {
  document.querySelectorAll('.tab-clean').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#cleaner-subnav .snav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('ctab-' + tab).classList.add('active');
  document.getElementById('sn-' + tab).classList.add('active');
}

function setSubMode(m) {
  subMode = m;
  document.getElementById('cmode-keep').className = 'cmode-btn' + (m === 'keep' ? ' active' : '');
  document.getElementById('cmode-strip').className = 'cmode-btn' + (m === 'strip' ? ' active' : '');
}

function isValidDomain(d) {
  return /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(d);
}

// Known 2-part TLDs — keeps googlehosted.co.uk intact
const TWO_PART_TLDS = new Set([
  'co.uk','co.jp','co.in','co.nz','co.za','co.au','co.net','co.il','co.id',
  'com.au','com.br','com.ar','com.mx','com.tr','com.sg','com.hk','com.my',
  'org.uk','net.uk','me.uk','gov.uk','ac.uk','org.au','net.au','edu.au',
  'co.kr','co.th','co.ke','co.tz','co.ug','co.mz'
]);

function getRootDomain(d) {
  const parts = d.toLowerCase().split('.');
  if (parts.length <= 2) return d;
  const lastTwo = parts.slice(-2).join('.');
  // If last two parts form a known 2-part TLD → root = last 3 parts
  if (TWO_PART_TLDS.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

function extractIPs(text) {
  // Scan every character sequence for digit-dot patterns, even inside mixed strings
  // e.g. "f195.3.222.232" or "33.3.222.232zefzef" → extract the IP part
  const found = [];
  // First pass: standard word-boundary IPs
  const regex1 = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g;
  let m;
  while ((m = regex1.exec(text)) !== null) {
    if (isIPv4(m[1])) found.push(m[1]);
  }
  return found;
}

function extractDomains(text) {
  const found = [];
  // Tokenize by splitting on spaces, tabs, newlines and obvious non-domain chars
  const tokens = text.split(/[\s,;|<>()[\]{}"'\\*+!=?@#$%^&~`]+/);
  tokens.forEach(token => {
    if (!token) return;
    // Try to extract a valid domain from within a mixed token like "domain.com66e5f"
    // Strategy: scan for the longest valid domain substring
    // Match pattern: letters/digits/dash sequences separated by dots, ending with a valid TLD
    const domainRegex = /(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}/g;
    let m;
    while ((m = domainRegex.exec(token)) !== null) {
      const candidate = m[0].toLowerCase();
      // Remove trailing dots
      const clean = candidate.replace(/\.+$/, '');
      if (clean && isValidDomain(clean) && !isIPv4(clean)) {
        found.push(clean);
      }
    }
  });
  return found;
}

function renderCleanList(outId, list) {
  const ob = document.getElementById(outId);
  ob.innerHTML = '';
  if (!list.length) { setEmpty(outId); return; }
  list.forEach((v, i) => {
    const d = document.createElement('div');
    d.className = 'output-line ok';
    d.style.animationDelay = `${i * 0.012}s`;
    const n = document.createElement('span'); n.className = 'line-num'; n.textContent = i + 1; d.appendChild(n);
    const ic = document.createElement('span'); ic.className = 'line-icon'; ic.textContent = '✓'; d.appendChild(ic);
    const tx = document.createElement('span'); tx.className = 'line-text'; tx.textContent = v; d.appendChild(tx);
    ob.appendChild(d);
  });
}

// Version ILLIMITÉE — suppression de la limite MAX (100 pour domaines, 200 pour IPs)
function finishExtract(p, raw, typeLabel) {
  if (p === 'cd' && subMode === 'strip') raw = raw.map(d => getRootDomain(d));
  const seen = new Set(); const kept = [];
  raw.forEach(v => { const k = v.toLowerCase(); if (!seen.has(k)) { seen.add(k); kept.push(v); } });
  // PLUS DE LIMITE — on garde TOUS les éléments
  const final = kept;
  store[p] = final;
  renderCleanList(p + '-out', final);
  const totalIn = document.getElementById(p + '-in').value.split('\n').filter(l => l.trim()).length;
  document.getElementById(p + '-sin').textContent = totalIn;
  document.getElementById(p + '-sout').textContent = final.length;
  document.getElementById(p + '-srem').textContent = raw.length - final.length;
  const oc = document.getElementById(p + '-oc');
  oc.textContent = final.length; oc.classList.toggle('active', final.length > 0);
  const sum = document.getElementById(p + '-sum');
  sum.textContent = `✦ ${final.length} ${typeLabel} extraite(s) · ${raw.length - final.length} ignorée(s)`;
  sum.classList.add('show');
  // Suppression du banner de limite
  const lb = document.getElementById(p + '-limit');
  lb.classList.remove('show');
  lb.innerHTML = '';
  enableCopy(p, final.length > 0);
  document.getElementById(p + '-cl').textContent = 'Copier';
  document.getElementById(p + '-cb').classList.remove('copied');
}

function runDomainExtract() {
  const text = document.getElementById('cd-in').value;
  if (!text.trim()) return;
  finishExtract('cd', extractDomains(text), 'domaine(s)');
}

function runIPExtract() {
  const text = document.getElementById('ci-in').value;
  if (!text.trim()) return;
  finishExtract('ci', extractIPs(text), 'IP(s)');
}

function copyExtract(p) {
  const lines = store[p] || []; if (!lines.length) return;
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    const cl = document.getElementById(p + '-cl'), cb = document.getElementById(p + '-cb');
    cl.textContent = '✓ Copié!'; cb.classList.add('copied');
    setTimeout(() => { cl.textContent = 'Copier'; cb.classList.remove('copied'); }, 2200);
  });
}

function clrExtract(p) {
  document.getElementById(p + '-in').value = '';
  setEmpty(p + '-out'); store[p] = [];
  document.getElementById(p + '-oc').textContent = '0';
  document.getElementById(p + '-oc').classList.remove('active');
  enableCopy(p, false);
  [p + '-sin', p + '-sout', p + '-srem'].forEach(id => document.getElementById(id).textContent = 0);
  document.getElementById(p + '-sum').classList.remove('show');
  const lb = document.getElementById(p + '-limit');
  lb.classList.remove('show');
  lb.innerHTML = '';
}

['cd-in', 'ci-in'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (id === 'cd-in') runDomainExtract(); else runIPExtract();
    }
  });
});

</script>
</body>
</html>
