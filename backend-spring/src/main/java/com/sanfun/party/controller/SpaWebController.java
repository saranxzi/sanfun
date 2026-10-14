package com.sanfun.party.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.File;

@Controller
public class SpaWebController {

    private final File distDir = resolveDistDir();

    public static File resolveDistDir() {
        File[] candidates = {
                new File("frontend-react/dist"),
                new File("../frontend-react/dist"),
                new File("../../frontend-react/dist")
        };
        for (File candidate : candidates) {
            if (candidate.isDirectory() && new File(candidate, "index.html").isFile()) {
                return candidate.getAbsoluteFile();
            }
        }
        return null;
    }

    @GetMapping(value = {"/", "/{path:[^\\.]*}"})
    public ResponseEntity<Resource> serveIndex() {
        if (distDir != null) {
            File indexFile = new File(distDir, "index.html");
            if (indexFile.isFile()) {
                return ResponseEntity.ok()
                        .contentType(MediaType.TEXT_HTML)
                        .body(new FileSystemResource(indexFile));
            }
        }
        ClassPathResource cpResource = new ClassPathResource("static/index.html");
        if (cpResource.exists()) {
            return ResponseEntity.ok()
                    .contentType(MediaType.TEXT_HTML)
                    .body(cpResource);
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .contentType(MediaType.TEXT_PLAIN)
                .body(new FileSystemResource(new File("frontend-react/dist/index.html")));
    }
}
