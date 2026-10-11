package com.gentlewalk.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class CorsConfigTest {

    @Test
    @DisplayName("CORS filter allows ECS on.aws domain and returns credentials header")
    void testCorsFilterAllowsEcsDomain() throws Exception {
        AppProperties properties = new AppProperties(
                60.0, 0.02, null, null, 0.3, 5.0, 0.9, null, null, null, null,
                new AppProperties.CorsProperties(List.of("https://*.on.aws", "https://*.cloudfront.net", "*")),
                "disclaimer",
                null
        );

        CorsConfig corsConfig = new CorsConfig(properties);
        CorsFilter filter = corsConfig.corsFilter();

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/plan");
        request.addHeader("Origin", "https://ge-603d77f297f3418cb26c0cda69a2656d.ecs.ap-south-1.on.aws");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        assertEquals("https://ge-603d77f297f3418cb26c0cda69a2656d.ecs.ap-south-1.on.aws",
                response.getHeader("Access-Control-Allow-Origin"));
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
    }

    @Test
    @DisplayName("CORS preflight request (OPTIONS) returns 200 and allowed methods")
    void testCorsPreflight() throws Exception {
        AppProperties properties = new AppProperties(
                60.0, 0.02, null, null, 0.3, 5.0, 0.9, null, null, null, null,
                new AppProperties.CorsProperties(List.of("*")),
                "disclaimer",
                null
        );

        CorsConfig corsConfig = new CorsConfig(properties);
        CorsFilter filter = corsConfig.corsFilter();

        MockHttpServletRequest request = new MockHttpServletRequest("OPTIONS", "/api/plan");
        request.addHeader("Origin", "https://d123456.cloudfront.net");
        request.addHeader("Access-Control-Request-Method", "POST");
        request.addHeader("Access-Control-Request-Headers", "Content-Type");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain filterChain = new MockFilterChain();

        filter.doFilter(request, response, filterChain);

        assertNotNull(response.getHeader("Access-Control-Allow-Origin"));
        assertEquals("true", response.getHeader("Access-Control-Allow-Credentials"));
    }
}
