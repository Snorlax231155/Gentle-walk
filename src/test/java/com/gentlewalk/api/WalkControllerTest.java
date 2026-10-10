package com.gentlewalk.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gentlewalk.air.AirQualityClient;
import com.gentlewalk.api.dto.PlanRequest;
import com.gentlewalk.config.AppProperties;
import com.gentlewalk.domain.Sensitivity;
import com.gentlewalk.graph.DemoGraphFactory;
import com.gentlewalk.graph.GraphBuilder;
import com.gentlewalk.service.DoseService;
import com.gentlewalk.service.LoopPlannerService;
import com.gentlewalk.service.WindowService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.notNullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(WalkController.class)
@Import({ApiExceptionHandler.class, WindowService.class, DoseService.class, LoopPlannerService.class, DemoGraphFactory.class})
class WalkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AirQualityClient airQualityClient;

    @MockBean
    private GraphBuilder graphBuilder;

    @MockBean
    private AppProperties appProperties;

    @Test
    @DisplayName("GET /api/health returns 200 OK")
    void testHealthEndpoint() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("gentle-walk"));
    }

    @Test
    @DisplayName("GET /api/window?demo=true returns 200 OK with demo mode and 24-hour series")
    void testGetWindowDemo() throws Exception {
        mockMvc.perform(get("/api/window").param("demo", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("demo"))
                .andExpect(jsonPath("$.window.hourlyPm25").isArray())
                .andExpect(jsonPath("$.window.startHour").isNumber())
                .andExpect(jsonPath("$.window.trafficLight").isString());
    }

    @Test
    @DisplayName("POST /api/plan in demo mode returns 200 OK with loop metrics")
    void testPlanDemoSuccess() throws Exception {
        PlanRequest request = new PlanRequest(
                28.6139,
                77.2090,
                800,
                20,
                Sensitivity.NORMAL,
                false,
                15,
                List.of(),
                true // demo
        );

        mockMvc.perform(post("/api/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("demo"))
                .andExpect(jsonPath("$.bestLoop").isMap())
                .andExpect(jsonPath("$.baselineLoop").isMap())
                .andExpect(jsonPath("$.reductionPct").isNumber())
                .andExpect(jsonPath("$.extraMinutes").isNumber())
                .andExpect(jsonPath("$.disclaimer").isString());
    }

    @Test
    @DisplayName("POST /api/plan with invalid ranges returns RFC 7807 400 Bad Request")
    void testPlanValidationFailure() throws Exception {
        // radius < 300, minutes < 10, invalid latitude
        String invalidJson = """
                {
                  "lat": 120.0,
                  "lon": 77.2090,
                  "radiusM": 100,
                  "minutes": 5
                }
                """;

        mockMvc.perform(post("/api/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Validation Error"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.invalidFields.lat", notNullValue()))
                .andExpect(jsonPath("$.invalidFields.radiusM", notNullValue()))
                .andExpect(jsonPath("$.invalidFields.minutes", notNullValue()));
    }

    @Test
    @DisplayName("POST /api/plan with live mode upstream failure returns RFC 7807 502 Bad Gateway")
    void testPlanUpstreamFailure() throws Exception {
        PlanRequest request = new PlanRequest(
                28.6139,
                77.2090,
                800,
                20,
                Sensitivity.NORMAL,
                false,
                15,
                List.of(),
                false // live mode
        );

        when(airQualityClient.getHourlyPm25(anyDouble(), anyDouble()))
                .thenThrow(new RuntimeException("Failed to query Open-Meteo Air Quality API: Timeout"));

        mockMvc.perform(post("/api/plan")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.title").value("Upstream Service Error"))
                .andExpect(jsonPath("$.detail", containsString("Open-Meteo")));
    }
}
