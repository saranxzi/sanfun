"""
Unified Launcher for Sanfun Couch Co-Op & Party Games Platform.
Automatically:
1. Spawns Cloudflare Tunnel (if cloudflared.exe is present) for zero-friction mobile/hotspot play.
2. Discovers Local LAN IP for offline Wi-Fi play.
3. Serves the unified FastAPI + Static frontend on port 8000.
4. Opens Host Big Screen in default browser.
"""
import os
import sys
import time
import re
import socket
import webbrowser
import subprocess
import threading
import signal

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
CLOUDFLARED_EXE = os.path.join(ROOT_DIR, "cloudflared.exe")
TUNNEL_FILE = os.path.join(ROOT_DIR, ".tunnel_url")

# Ensure backend modules are on sys.path
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def get_local_ip() -> str:
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()


def launch_tunnel():
    """Starts cloudflared quick tunnel and extracts the public https url."""
    if not os.path.isfile(CLOUDFLARED_EXE):
        return None

    print("[TUNNEL] Starting Cloudflare Edge Tunnel for hotspot/mobile bypass...")
    try:
        proc = subprocess.Popen(
            [CLOUDFLARED_EXE, "tunnel", "--url", "http://127.0.0.1:8000"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
        )

        tunnel_url = None
        start_time = time.time()

        def stream_logs():
            nonlocal tunnel_url
            for line in proc.stdout:
                match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
                if match and not tunnel_url:
                    tunnel_url = match.group(0)
                    os.environ["PUBLIC_TUNNEL_URL"] = tunnel_url
                    with open(TUNNEL_FILE, "w", encoding="utf-8") as f:
                        f.write(tunnel_url)
                    print("\n" + "=" * 64)
                    print(f"  [INTERNET TUNNEL READY] {tunnel_url}")
                    print("  Phones anywhere (hotspots, mobile data) can join via this link!")
                    print("=" * 64 + "\n")

        t = threading.Thread(target=stream_logs, daemon=True)
        t.start()

        # Wait up to 6 seconds for tunnel URL
        while time.time() - start_time < 6.0 and not tunnel_url:
            time.sleep(0.2)

        return proc
    except Exception as e:
        print(f"[TUNNEL] Failed to launch cloudflared: {e}")
        return None


def main():
    print("=" * 64)
    print("       SANFUN COUCH CO-OP & PARTY GAMES PLATFORM")
    print("=" * 64)

    local_ip = get_local_ip()
    print(f"[LOCAL] LAN IP: http://{local_ip}:8000")

    # Clean old tunnel file
    if os.path.isfile(TUNNEL_FILE):
        try:
            os.remove(TUNNEL_FILE)
        except Exception:
            pass

    # Start Cloudflare Tunnel in background
    tunnel_proc = launch_tunnel()

    # Open host screen after a brief delay
    def open_browser():
        time.sleep(1.5)
        host_url = "http://localhost:8000/?party=host"
        print(f"[HOST] Opening party lounge: {host_url}")
        webbrowser.open(host_url)

    threading.Thread(target=open_browser, daemon=True).start()

    # Cleanup hook
    def cleanup(*args):
        print("\n[SERVER] Shutting down Sanfun Party...")
        if tunnel_proc:
            try:
                tunnel_proc.terminate()
                tunnel_proc.kill()
            except Exception:
                pass
        if os.path.isfile(TUNNEL_FILE):
            try:
                os.remove(TUNNEL_FILE)
            except Exception:
                pass
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # Run Uvicorn
    import uvicorn
    from app.main import app

    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    finally:
        cleanup()


if __name__ == "__main__":
    main()
