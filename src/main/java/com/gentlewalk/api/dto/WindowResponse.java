package com.gentlewalk.api.dto;

import com.gentlewalk.domain.WindowResult;

public record WindowResponse(
        String mode,
        WindowResult window,
        String disclaimer
) {}
