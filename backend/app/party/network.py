"""Network utilities for local LAN IP discovery, Cloudflare Tunnel management, and connection addressing."""
import os
import sys
import re
import socket
import subprocess
import threading
import shutil
import asyncio
from typing import List, Dict, Any, Optional

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
TUNNEL_FILE = os.path.join(ROOT_DIR, ".tunnel_url")


def get_local_ip() -> str:
    """
    Detects the primary non-loopback local IPv4 address of this machine.
    Falls back to environment variable HOST_LAN_IP if specified, or '127.0.0.1'.
    """
    env_override = os.environ.get("HOST_LAN_IP")
    if env_override:
        return env_override

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        if ip and not ip.startswith("127.") and not ip.startswith("169.254."):
            return ip
    except Exception:
        pass
    finally:
        s.close()

    try:
        hostname = socket.gethostname()
        _, _, ips = socket.gethostbyname_ex(hostname)
        for ip in ips:
            if not ip.startswith("127.") and not ip.startswith("169.254."):
                return ip
    except Exception:
        pass

    return "127.0.0.1"


_registered_tunnel_url: Optional[str] = None


def set_tunnel_url(url: str):
    global _registered_tunnel_url
    _registered_tunnel_url = url.strip()


def get_active_tunnel_url() -> Optional[str]:
    if _registered_tunnel_url:
        return _registered_tunnel_url

    env_tunnel = os.environ.get("PUBLIC_TUNNEL_URL", "").strip()
    if env_tunnel:
        return env_tunnel

    if os.path.isfile(TUNNEL_FILE):
        try:
            with open(TUNNEL_FILE, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content.startswith("http"):
                    return content
        except Exception:
            pass
    return None


class CloudflareTunnelManager:
    """
    Manages the lifecycle of the Cloudflare Edge Tunnel (cloudflared).
    Guarantees single instance execution, cleans up stale processes,
    discovers the trycloudflare.com URL, and notifies active party rooms.
    """
    def __init__(self, port: int = 8000):
        self.port = port
        self.proc: Optional[subprocess.Popen] = None
        self.tunnel_url: Optional[str] = None
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def _find_cloudflared_exe(self) -> Optional[str]:
        exe = os.path.join(ROOT_DIR, "cloudflared.exe")
        return exe if os.path.isfile(exe) else shutil.which("cloudflared")

    def _kill_existing_instances(self):
        """Kills any orphaned cloudflared processes to avoid tunnel collision and rate limiting."""
        if os.name == "nt":
            try:
                subprocess.run(
                    ["taskkill", "/F", "/IM", "cloudflared.exe"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                import time
                time.sleep(0.15)
            except Exception:
                pass
        else:
            try:
                subprocess.run(
                    ["pkill", "-f", "cloudflared"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            except Exception:
                pass

    def start(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        # Do not start subprocesses during automated test suite runs
        if "pytest" in sys.modules or os.environ.get("TESTING") == "1":
            return

        if self.proc is not None:
            return

        self._loop = loop
        exe_path = self._find_cloudflared_exe()
        if not exe_path:
            print("[TUNNEL] cloudflared binary not found; running in local Wi-Fi mode.")
            return

        self._kill_existing_instances()
        self._stop_event.clear()

        print(f"[TUNNEL] Starting Cloudflare Edge Tunnel proxy for port {self.port}...")
        try:
            self.proc = subprocess.Popen(
                [exe_path, "tunnel", "--url", f"http://127.0.0.1:{self.port}"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
            )
        except Exception as e:
            print(f"[TUNNEL] Failed to launch cloudflared: {e}")
            self.proc = None
            return

        def _monitor():
            global _registered_tunnel_url
            for line in iter(self.proc.stdout.readline, ''):
                if self._stop_event.is_set():
                    break
                match = re.search(r"https://[a-zA-Z0-9-]+\.trycloudflare\.com", line)
                if match and not self.tunnel_url:
                    self.tunnel_url = match.group(0)
                    _registered_tunnel_url = self.tunnel_url
                    os.environ["PUBLIC_TUNNEL_URL"] = self.tunnel_url

                    # Write to root .tunnel_url file
                    try:
                        with open(TUNNEL_FILE, "w", encoding="utf-8") as f:
                            f.write(self.tunnel_url)
                    except Exception:
                        pass

                    print(f"\n========================================================")
                    print(f"  [TUNNEL READY] {self.tunnel_url}")
                    print(f"  Phones on mobile data/hotspot can join via this link!")
                    print(f"========================================================\n")

                    # Notify active lobby rooms via WebSocket
                    if self._loop and self._loop.is_running():
                        try:
                            from app.party.manager import room_manager
                            for r in list(room_manager.rooms.values()):
                                if r.state == "LOBBY":
                                    asyncio.run_coroutine_threadsafe(
                                        r.broadcast_room_state(), self._loop
                                    )
                        except Exception:
                            pass

            if not self._stop_event.is_set() and not self.tunnel_url:
                print("[TUNNEL] cloudflared process ended before tunnel URL was acquired.")

            if self.proc:
                self.proc.poll()

        self._thread = threading.Thread(target=_monitor, daemon=True)
        self._thread.start()

    def stop(self):
        self._stop_event.set()
        if self.proc:
            try:
                self.proc.terminate()
                self.proc.kill()
            except Exception:
                pass
            self.proc = None
        self.tunnel_url = None
        global _registered_tunnel_url
        _registered_tunnel_url = None
        self._kill_existing_instances()

        if os.path.isfile(TUNNEL_FILE):
            try:
                os.remove(TUNNEL_FILE)
            except Exception:
                pass


tunnel_manager = CloudflareTunnelManager(port=8000)


def get_network_info(port: int = 8000) -> Dict[str, Any]:
    """
    Returns comprehensive network info for Host screen display,
    including candidate IPs and URLs.
    """
    primary_ip = get_local_ip()
    candidates: List[str] = [primary_ip]

    try:
        hostname = socket.gethostname()
        _, _, ips = socket.gethostbyname_ex(hostname)
        for ip in ips:
            if ip not in candidates and not ip.startswith("127.") and not ip.startswith("169.254."):
                candidates.append(ip)
    except Exception:
        pass

    tunnel_url = get_active_tunnel_url()

    return {
        "primary_ip": primary_ip,
        "candidates": candidates,
        "port": port,
        "local_url": f"http://{primary_ip}:{port}",
        "tunnel_url": tunnel_url if tunnel_url else None,
        "is_loopback": primary_ip.startswith("127."),
    }
