"""Network utilities for local LAN IP discovery and connection addressing."""
import os
import socket
from typing import List, Dict, Any, Optional


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

    # Check candidate .tunnel_url file paths
    candidate_paths = [
        os.path.abspath(".tunnel_url"),
        os.path.abspath("../.tunnel_url"),
        os.path.abspath("../../.tunnel_url"),
        os.path.join(os.path.dirname(__file__), "../../../.tunnel_url"),
    ]
    for p in candidate_paths:
        if os.path.isfile(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                    if content.startswith("http"):
                        return content
            except Exception:
                pass
    return None


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
