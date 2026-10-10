package com.gentlewalk.domain;

public enum Sensitivity {
    NORMAL,
    SENSITIVE,
    VERY_SENSITIVE;

    public static Sensitivity fromString(String val) {
        if (val == null) {
            return NORMAL;
        }
        return switch (val.toUpperCase().trim()) {
            case "SENSITIVE" -> SENSITIVE;
            case "VERY_SENSITIVE", "VERY SENSITIVE", "VERYSENSITIVE" -> VERY_SENSITIVE;
            default -> NORMAL;
        };
    }
}
