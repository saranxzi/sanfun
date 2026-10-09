package com.sanfun.party.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.File;
import java.io.IOException;

@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File distDir = new File("frontend-react/dist");
        if (!distDir.isDirectory()) {
            distDir = new File("../frontend-react/dist");
        }

        if (distDir.isDirectory()) {
            String distPath = distDir.getAbsolutePath() + File.separator;
            registry.addResourceHandler("/**")
                    .addResourceLocations("file:" + distPath)
                    .resourceChain(true)
                    .addResolver(new PathResourceResolver() {
                        @Override
                        protected Resource getResource(String resourcePath, Resource location) throws IOException {
                            if (resourcePath.startsWith("api/")) {
                                return null;
                            }
                            Resource requestedResource = location.createRelative(resourcePath);
                            return requestedResource.exists() && requestedResource.isReadable()
                                    ? requestedResource
                                    : new FileSystemResource(new File(location.getFile(), "index.html"));
                        }
                    });
        }
    }
}
