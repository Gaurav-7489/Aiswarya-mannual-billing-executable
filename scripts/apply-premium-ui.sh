#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cat > src/app/production-ui.css <<'CSS'
:root{--afp-ink:#17352a;--afp-muted:#61736a;--afp-bg:#f4f1e8;--afp-card:#fffdf8;--afp-line:#d9e0d8;--afp-green:#176b4d;--afp-deep:#0e4d39;--afp-gold:#c89b3c;--afp-red:#a63a32;--afp-shadow:0 14px 40px rgba(20,50,38,.08)}
body{background:var(--afp-bg);color:var(--afp-ink)}a{color:var(--afp-green)}button{transition:transform .15s ease,box-shadow .15s ease,background .15s ease,border-color .15s ease}button:hover:not(:disabled){transform:translateY(-1px)}button:disabled{cursor:not-allowed}input,select,textarea{border-color:var(--afp-line);background:#fffdfb;box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}input:focus,select:focus,textarea:focus{border-color:var(--afp-green)!important;box-shadow:0 0 0 4px rgba(23,107,77,.12)!important}
.dashboard-shell{background:linear-gradient(180deg,#f5f1e8 0%,#eef3ed 100%)!important}.dashboard-frame{max-width:1480px}.dashboard-header{padding:4px 0 8px}.brand-orb{background:var(--afp-green)!important;border:0!important;box-shadow:0 6px 16px rgba(23,107,77,.2)!important}.dashboard-header .eyebrow{color:var(--afp-green)}.dashboard-header h1{color:var(--afp-ink)}.welcome-strip{background:linear-gradient(135deg,#0f513a,#176b4d)!important;box-shadow:0 8px 0 #c89b3c!important}.section-kicker{color:#b8892e!important}.hero-invoice-button{border-color:#eadfca!important}.hero-plus{background:var(--afp-green)!important}.metric-card,.quick-card,.panel{background:var(--afp-card)!important;border-color:var(--afp-line)!important;box-shadow:var(--afp-shadow)!important}.metric-accent{background:var(--afp-green)!important;border-color:var(--afp-green)!important}.quick-icon,.metric-top i,.rank,.empty-icon{background:#edf4ef!important;color:var(--afp-green)!important}.quick-card:hover{border-color:#a9c5b6!important}.panel-heading{border-color:var(--afp-line)!important}.invoice-row:hover{background:#f1f7f3!important}.status.finalized{background:#e4f2e9!important;color:#176b4d!important}.error-banner,.notice-banner{border-color:#e4bbb5!important;background:#fff4f1!important;color:#8d3129!important}
.customers-page,.products-page,.settings-page,.history-page{background:transparent!important;color:var(--afp-ink)!important}.customers-header,.products-header,.history-header{border-bottom:1px solid rgba(23,53,42,.08);padding-bottom:22px}.customers-header small,.products-header small,.history-header small,.settings-header .eyebrow{color:var(--afp-green)!important}.customer-list-card,.customer-detail,.product-list-card,.product-detail,.settings-card,.history-card{background:var(--afp-card)!important;border-color:var(--afp-line)!important;box-shadow:var(--afp-shadow)!important}.primary,.save,.product-search button,.customer-search button,.new-invoice,.history-search button{background:var(--afp-green)!important;color:#fff!important;border-color:var(--afp-green)!important}.secondary,.close,.settings-page .secondary-button{background:#fffdf8!important;color:var(--afp-ink)!important;border-color:var(--afp-line)!important}.customer-item,.product-item{background:transparent!important;border-color:var(--afp-line)!important}.customer-item:hover,.product-item:hover{background:#f0f6f2!important}.customer-item.active,.product-item.active{background:#eaf3ed!important}.customer-stats article{background:#f8faf7!important;border-color:var(--afp-line)!important}.customer-error,.product-error{background:#fff3f1!important;border-color:#e8c1bc!important}
.settings-page{max-width:1240px!important}.settings-card{border-radius:18px!important}.security-card{background:linear-gradient(135deg,#f8fcf9,#eef6f0)!important}.save-bar{border-color:var(--afp-line)!important;box-shadow:0 10px 30px rgba(20,50,38,.08)!important}.save-bar button{background:var(--afp-green)!important}
.invoice-workspace{background:linear-gradient(180deg,#f5f1e8,#eef4ef)!important}.invoice-card{background:var(--afp-card)!important;border-color:var(--afp-line)!important;box-shadow:var(--afp-shadow)!important}.invoice-section-title>b{background:var(--afp-green)!important}.local-status.good{background:#e5f3ea!important;color:var(--afp-green)!important;border-color:#b9d8c5!important}.local-status.warning{background:#fff1ed!important;color:#96372f!important;border-color:#e5b8b0!important}.save-button{background:var(--afp-green)!important}.clear-button{border-color:var(--afp-line)!important}.grand{border-color:var(--afp-green)!important}.save-success{background:#eff8f2!important;border-color:#b9d8c5!important}.save-error{background:#fff3f1!important;border-color:#e6bdb6!important}
.history-row{background:transparent!important}.history-row:hover{background:#f1f7f3!important}.history-head{background:#edf4ef!important;border-radius:10px}.status-finalized{background:#e4f2e9!important;color:#176b4d!important}
@media(max-width:700px){.customers-page,.products-page,.settings-page,.history-page{padding:18px!important}}
CSS

python3 - <<'PY'
from pathlib import Path
p=Path('src/app/layout.tsx')
s=p.read_text()
if "import './production-ui.css'" not in s:
    s=s.replace("import './globals.css'", "import './globals.css'\nimport './production-ui.css'")
p.write_text(s)
PY

echo 'Premium UI layer applied.'
