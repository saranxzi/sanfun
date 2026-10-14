package com.sanfun.party.config;

import com.sanfun.party.controller.SpaWebController;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class SpaWebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        File distDir = SpaWebController.resolveDistDir();
        if (distDir != null) {
            String distUri = distDir.toURI().toString();
            if (!distUri.endsWith("/")) {
                distUri += "/";
            }
            registry.addResourceHandler("/assets/**")
                    .addResourceLocations(distUri + "assets/", "classpath:/static/assets/");
            registry.addResourceHandler("/*.*")
                    .addResourceLocations(distUri, "classpath:/static/");
        } else {
            registry.addResourceHandler("/assets/**")
                    .addResourceLocations("classpath:/static/assets/");
            registry.addResourceHandler("/*.*")
                    .addResourceLocations("classpath:/static/");
        }
    }
}
