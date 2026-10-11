package com.gentlewalk.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gentlewalk.api.dto.CreateCommunityRouteRequest;
import com.gentlewalk.service.CommunityRouteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CommunityRouteController.class)
@Import({CommunityRouteService.class, ApiExceptionHandler.class})
class CommunityRouteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void testGetRoutes() throws Exception {
        mockMvc.perform(get("/api/community/routes")
                        .param("lat", "28.5933")
                        .param("lon", "77.2215"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").exists())
                .andExpect(jsonPath("$[0].title").exists());
    }

    @Test
    void testSubmitRoute() throws Exception {
        CreateCommunityRouteRequest req = new CreateCommunityRouteRequest(
                "Shanti Colony Tree Walk",
                "Grandma Leela",
                "Peaceful loop with shade.",
                List.of("🌳 Shade", "🪑 Benches"),
                28.59, 77.22,
                1000.0, 15, 4, 16.0, "GREEN",
                List.of(List.of(77.22, 28.59), List.of(77.23, 28.60), List.of(77.22, 28.59)),
                List.of()
        );

        mockMvc.perform(post("/api/community/routes")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.title").value("Shanti Colony Tree Walk"))
                .andExpect(jsonPath("$.author").value("Grandma Leela"));
    }

    @Test
    void testCheerRoute() throws Exception {
        mockMvc.perform(post("/api/community/routes/cr-lodhi-1/cheer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cheersCount").isNumber());
    }
}
