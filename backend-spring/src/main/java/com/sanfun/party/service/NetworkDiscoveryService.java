package com.sanfun.party.service;

import com.sanfun.party.model.NetworkInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.net.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class NetworkDiscoveryService {

    @Value("${server.port:8000}")
    private int port;

    private final AtomicReference<String> registeredTunnelUrl = new AtomicReference<>(null);

    public String getLocalIp() {
        String envOverride = System.getenv("HOST_LAN_IP");
        if (envOverride != null && !envOverride.isBlank()) {
            return envOverride.trim();
        }

        try (DatagramSocket socket = new DatagramSocket()) {
            socket.connect(InetAddress.getByName("8.8.8.8"), 80);
            String ip = socket.getLocalAddress().getHostAddress();
            if (ip != null && !ip.startsWith("127.") && !ip.startsWith("169.254.")) {
                return ip;
            }
        } catch (Exception ignored) {}

        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress() && !addr.isLinkLocalAddress()) {
                        return addr.getHostAddress();
                    }
                }
            }
        } catch (Exception ignored) {}

        return "127.0.0.1";
    }

    public void setTunnelUrl(String url) {
        if (url != null) {
            registeredTunnelUrl.set(url.trim());
        } else {
            registeredTunnelUrl.set(null);
        }
    }

    public String getActiveTunnelUrl() {
        String reg = registeredTunnelUrl.get();
        if (reg != null && !reg.isBlank()) {
            return reg;
        }

        String envTunnel = System.getenv("PUBLIC_TUNNEL_URL");
        if (envTunnel != null && !envTunnel.isBlank()) {
            return envTunnel.trim();
        }

        Path tunnelFilePath = Path.of(".tunnel_url");
        if (!Files.isRegularFile(tunnelFilePath)) {
            tunnelFilePath = Path.of("../.tunnel_url");
        }
        if (Files.isRegularFile(tunnelFilePath)) {
            try {
                String content = Files.readString(tunnelFilePath).trim();
                if (content.startsWith("http")) {
                    return content;
                }
            } catch (IOException ignored) {}
        }

        return null;
    }

    public NetworkInfo getNetworkInfo() {
        String primaryIp = getLocalIp();
        Set<String> candidates = new LinkedHashSet<>();
        candidates.add(primaryIp);

        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) continue;
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress() && !addr.isLinkLocalAddress()) {
                        candidates.add(addr.getHostAddress());
                    }
                }
            }
        } catch (Exception ignored) {}

        String tunnelUrl = getActiveTunnelUrl();
        return new NetworkInfo(
                primaryIp,
                new ArrayList<>(candidates),
                port,
                "http://" + primaryIp + ":" + port,
                tunnelUrl,
                primaryIp.startsWith("127.")
        );
    }
}
