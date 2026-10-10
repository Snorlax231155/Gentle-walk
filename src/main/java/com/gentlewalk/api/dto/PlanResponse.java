package com.gentlewalk.api.dto;

import com.gentlewalk.domain.LoopResult;
import com.gentlewalk.domain.WindowResult;

public record PlanResponse(
        String mode,
        WindowResult window,
        LoopResult bestLoop,
        LoopResult baselineLoop,
        Double reductionPct,
        Double extraMinutes,
        String disclaimer
) {}
