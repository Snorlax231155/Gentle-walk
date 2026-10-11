package com.gentlewalk.api.dto;

import com.gentlewalk.domain.IndoorVenue;
import com.gentlewalk.domain.LoopResult;
import com.gentlewalk.domain.WindowResult;

import java.util.List;

public record PlanResponse(
        String mode,
        WindowResult window,
        LoopResult bestLoop,
        LoopResult baselineLoop,
        Double reductionPct,
        Double extraMinutes,
        String disclaimer,
        List<IndoorVenue> indoorFallbacks
) {}
