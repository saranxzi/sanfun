package com.sanfun.party.service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.File;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class CloudflareTunnelSupervisor {

    private static final Logger log = LoggerFactory.getLogger(CloudflareTunnelSupervisor.class);
    private static final Pattern TUNNEL_REGEX = Pattern.compile("https://[a-zA-Z0-9-]+\\.trycloudflare\\.com");

    @Value("${server.port:8000}")
    private int port;

    private final NetworkDiscoveryService networkDiscoveryService;
    private final PartyRoomManager partyRoomManager;

    private Process process;
    private Thread monitorThread;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public CloudflareTunnelSupervisor(NetworkDiscoveryService networkDiscoveryService,
                                      @Lazy PartyRoomManager partyRoomManager) {
        this.networkDiscoveryService = networkDiscoveryService;
        this.partyRoomManager = partyRoomManager;
    }

    private File findCloudflaredExe() {
        File[] candidates = {
                new File("cloudflared.exe"),
                new File("../cloudflared.exe"),
                new File("cloudflared")
        };
        for (File f : candidates) {
            if (f.isFile() && f.canExecute()) {
                return f;
            }
        }
        return null;
    }

    private void killExistingInstances() {
        String os = System.getProperty("os.name", "").toLowerCase();
        try {
            if (os.contains("win")) {
                new ProcessBuilder("taskkill", "/F", "/IM", "cloudflared.exe")
                        .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                        .redirectError(ProcessBuilder.Redirect.DISCARD)
                        .start()
                        .waitFor();
            } else {
                new ProcessBuilder("pkill", "-f", "cloudflared")
                        .redirectOutput(ProcessBuilder.Redirect.DISCARD)
                        .redirectError(ProcessBuilder.Redirect.DISCARD)
                        .start()
                        .waitFor();
            }
            Thread.sleep(150);
        } catch (Exception ignored) {}
    }

    @PostConstruct
    public void start() {
        if (port <= 0 ||
                "1".equals(System.getenv("TESTING")) ||
                System.getProperty("surefire.test.class.path") != null ||
                System.getProperty("test") != null) {
            return;
        }

        File exe = findCloudflaredExe();
        if (exe == null) {
            log.info("[TUNNEL] cloudflared binary not found; running in local Wi-Fi mode.");
            return;
        }

        killExistingInstances();
        running.set(true);

        log.info("[TUNNEL] Starting Cloudflare Edge Tunnel proxy for port {}...", port);
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    exe.getAbsolutePath(),
                    "tunnel",
                    "--url", "http://127.0.0.1:" + port
            );
            pb.redirectErrorStream(true);
            process = pb.start();

            monitorThread = new Thread(() -> {
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                    String line;
                    while (running.get() && (line = reader.readLine()) != null) {
                        Matcher matcher = TUNNEL_REGEX.matcher(line);
                        if (matcher.find()) {
                            String url = matcher.group(0);
                            networkDiscoveryService.setTunnelUrl(url);

                            try {
                                Files.writeString(Path.of(".tunnel_url"), url);
                                Files.writeString(Path.of("../.tunnel_url"), url);
                            } catch (Exception ignored) {}

                            log.info("\n========================================================");
                            log.info("  [TUNNEL READY] {}", url);
                            log.info("  Phones on mobile data/hotspot can join via this link!");
                            log.info("========================================================\n");

                            partyRoomManager.broadcastToAllLobbies();
                            break;
                        }
                    }
                } catch (Exception e) {
                    if (running.get()) {
                        log.warn("[TUNNEL] Monitor loop encountered exception: {}", e.getMessage());
                    }
                }
            }, "cloudflare-tunnel-monitor");
            monitorThread.setDaemon(true);
            monitorThread.start();

        } catch (Exception e) {
            log.error("[TUNNEL] Failed to launch cloudflared: {}", e.getMessage());
        }
    }

    @PreDestroy
    public void stop() {
        running.set(false);
        networkDiscoveryService.setTunnelUrl(null);

        if (process != null) {
            try {
                process.destroy();
                process.destroyForcibly();
            } catch (Exception ignored) {}
            process = null;
        }
        killExistingInstances();

        try {
            Files.deleteIfExists(Path.of(".tunnel_url"));
            Files.deleteIfExists(Path.of("../.tunnel_url"));
        } catch (Exception ignored) {}
    }
}
