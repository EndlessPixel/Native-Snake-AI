#!/usr/bin/env bash
set -euo pipefail

# ---------- helpers ----------
log_info ()  { printf '\033[36m[INFO]  %s\033[0m\n' "$*"; }
log_error () { printf '\033[31m[ERROR] %s\033[0m\n' "$*" >&2; }
log_tip  ()  { printf '\033[33m[TIP]   %s\033[0m\n' "$*"; }
die ()       { log_error "$*"; exit 1; }

fake_progress () {
  local jobs=(urllib ssl argparse http.server datetime platform sys os random)
  local total=${#jobs[@]}
  for i in "${!jobs[@]}"; do
    pct=$(( (i+1)*100/total ))
    printf '\r[%-20s] %3d%%' "$(printf '%0.s#' $(seq 1 $((pct/5))))" "$pct"
    sleep 0.$(shuf -i 15-25 -n1)
  done
  echo
}

random_tip (){
  tips=(
    "Press Ctrl-C twice to force-stop the server."
    "Add '--directory \$HOME' to serve your home folder."
    "Use 8000 instead of 8080 if the port is taken."
    "Run 'python -m http.server --help' for more options."
  )
  log_tip "${tips[RANDOM % ${#tips[@]}]}"
}

# ---------- main ----------
cat <<'BANNER'
==============================================
 HTTP Server Launcher  (Bulky Edition v1.0)
==============================================
BANNER

log_info "STEP 1/4  Detecting Python Interpreter"
command -v python >/dev/null || die "Python interpreter not found or not executable."
PY_VER=$(python --version 2>&1)
log_info "$PY_VER detected."

log_info "STEP 2/4  Checking Minimum Version"
python -c 'import sys; sys.exit(0 if sys.version_info>=(3,6) else 1)' \
  || die "Python 3.6+ required."
log_info "Version constraint satisfied."

log_info "STEP 3/4  Initialising Sub-modules"
fake_progress
random_tip

log_info "STEP 4/4  Starting HTTP Server"
log_info "Serving on http://localhost:8080  [Ctrl-C to stop]"
exec python -m http.server 8080