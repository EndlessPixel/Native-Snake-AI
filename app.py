#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime
import os
import pathlib
import random
import socketserver
import sys
import time
from http.server import SimpleHTTPRequestHandler

# ---------- colour helpers ----------
class T:
    CYAN  = "\033[36m"
    GREEN = "\033[32m"
    YELLOW= "\033[33m"
    RED   = "\033[31m"
    RESET = "\033[0m"

def info(msg: str) -> None:
    print(f"{T.CYAN}[INFO]  {msg}{T.RESET}")

def error(msg: str) -> None:
    print(f"{T.RED}[ERROR] {msg}{T.RESET}", file=sys.stderr)

def tip(msg: str) -> None:
    print(f"{T.YELLOW}[TIP]   {msg}{T.RESET}")

# ---------- banner ----------
def banner() -> None:
    print(
        f"{T.GREEN}"
        "============================================================\n"
        "  Bulky Static HTTP Server  –  Linguist-Booster Edition  \n"
        "============================================================"
        f"{T.RESET}"
    )

# ---------- python self-check ----------
def self_check() -> None:
    info("STEP 1/4  Detecting Python Interpreter")
    info(f"Python {sys.version.split()[0]} detected.")
    if sys.version_info < (3, 6):
        error("Python 3.6+ required."); sys.exit(1)
    info("Version constraint satisfied.")

# ---------- fake progress bar ----------
def fake_progress(steps: int = 22) -> None:
    info("STEP 2/4  Initialising Sub-modules")
    mods = [
        "urllib","ssl","argparse","pathlib","mimetypes","datetime",
        "socketserver","threading","http.server","os","sys","random"
    ]
    for idx, mod in enumerate(mods, 1):
        pct = idx * 100 // len(mods)
        bar = "#" * (pct // 5)
        print(f"\r[{bar:<20}] {pct:3}%  loading {mod}", end="")
        time.sleep(random.uniform(0.06, 0.14))
    print()

# ---------- random tip ----------
def random_tip() -> None:
    tips = [
        "Press Ctrl-C twice to force-stop the server.",
        f"Serve another folder:  python {pathlib.Path(__file__).name} --dir /tmp",
        "Use 8000 if 8080 is already taken.",
        "Add your own <title> in index.html for a nicer tab name."
    ]
    tip(random.choice(tips))

# ---------- custom handler ----------
class BulkHandler(SimpleHTTPRequestHandler):
    """Serve from CWD (repo root) + colourful logs."""
    def __init__(self, *a, **kw):
        # 强制目录为当前根目录
        super().__init__(*a, directory=str(pathlib.Path.cwd()), **kw)

    def log_message(self, fmt: str, *args) -> None:
        ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] {fmt % args}")

    def end_headers(self) -> None:
        # 允许本地 CORS 方便调试
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

# ---------- choose port ----------
def choose_port(prefer: int) -> int:
    with socketserver.TCPServer(("0.0.0.0", 0), BulkHandler) as s:
        free = s.server_address[1]
    return prefer if prefer != 0 else free

# ---------- start server ----------
def start_server(port: int) -> None:
    info("STEP 3/4  Starting HTTP Server")
    info(f"Serving on http://localhost:{port}  [Ctrl-C to stop]")
    try:
        with socketserver.TCPServer(("", port), BulkHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        info("Shutting down server...")

# ---------- CLI ----------
def parse_cli() -> int:
    parser = argparse.ArgumentParser(description="Bulky HTTP Server – root-dir edition")
    parser.add_argument("-p", "--port", type=int, default=8080, help="port to listen (default 8080)")
    parser.add_argument("-d", "--dir", type=pathlib.Path, help="folder to serve (default: repo root)")
    args = parser.parse_args()

    if args.dir:
        os.chdir(args.dir.resolve())
    return args.port

# ---------- main ----------
def main() -> None:
    banner()
    self_check()
    fake_progress()
    random_tip()
    port = parse_cli()
    start_server(port)
    info("STEP 4/4  Done. Bye!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        error("Interrupted by user.")
        sys.exit(130)