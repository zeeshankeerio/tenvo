import type { Config } from "tailwindcss";
import {
    BRAND_PRIMARY,
    BRAND_PRIMARY_LIGHT,
    BRAND_PRIMARY_DARK,
    BRAND_50,
    BRAND_100,
    HALF_WHITE,
    SUPER_WHITE,
    CANVAS_BG,
} from "./lib/theme/brandTokens";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: BRAND_PRIMARY,
                    "primary-light": BRAND_PRIMARY_LIGHT,
                    "primary-dark": BRAND_PRIMARY_DARK,
                    50: BRAND_50,
                    100: BRAND_100,
                },
                canvas: CANVAS_BG,
                "half-white": HALF_WHITE,
                "super-white": SUPER_WHITE,
                neutral: {
                    50: "#FAFAFA",
                    100: "#F5F4F4",
                    200: "#ECEAEA",
                    300: "#D4D1D1",
                    400: "#A8A4A4",
                    500: "#717171",
                    600: "#525252",
                    700: "#3D3D3D",
                    800: "#262626",
                    900: "#171717",
                },
                success: {
                    DEFAULT: "#10B981",
                    light: "#D1FAE5",
                    dark: "#059669",
                },
                warning: {
                    DEFAULT: "#F59E0B",
                    light: "#FEF3C7",
                    dark: "#D97706",
                },
                error: {
                    DEFAULT: "#DC2626",
                    light: "#FEE2E2",
                    dark: "#991B1B",
                },
                info: {
                    DEFAULT: "#2563EB",
                    light: "#EFF6FF",
                    dark: "#1D4ED8",
                },
                wine: {
                    50: BRAND_50,
                    100: BRAND_100,
                    200: "#F9D4D4",
                    300: "#F0A8A8",
                    400: "#E86B6B",
                    500: BRAND_PRIMARY,
                    600: BRAND_PRIMARY_DARK,
                    700: "#8B1A1A",
                    800: "#6B1414",
                    900: "#450A0A",
                    950: "#2E0707",
                    DEFAULT: BRAND_PRIMARY,
                    light: BRAND_PRIMARY_LIGHT,
                    dark: BRAND_PRIMARY_DARK,
                },
            },
            boxShadow: {
                sm: "0 1px 2px 0 rgba(23, 23, 23, 0.04)",
                md: "0 4px 12px -2px rgba(23, 23, 23, 0.08), 0 2px 4px -2px rgba(23, 23, 23, 0.04)",
                lg: "0 12px 24px -4px rgba(23, 23, 23, 0.1), 0 4px 8px -4px rgba(23, 23, 23, 0.06)",
                xl: "0 20px 32px -6px rgba(23, 23, 23, 0.12), 0 8px 16px -6px rgba(23, 23, 23, 0.06)",
                "2xl": "0 28px 48px -8px rgba(23, 23, 23, 0.16)",
                brand: "0 4px 14px -2px rgba(210, 43, 43, 0.28)",
            },
            spacing: {
                "0.5": "0.125rem",
                "1.5": "0.375rem",
                "2.5": "0.625rem",
                "3.5": "0.875rem",
                "4.5": "1.125rem",
                "5.5": "1.375rem",
                "6.5": "1.625rem",
                "7.5": "1.875rem",
            },
            borderRadius: {
                sm: "0.375rem",
                md: "0.5rem",
                lg: "0.75rem",
                xl: "1rem",
                "2xl": "1.25rem",
            },
            fontFamily: {
                sans: ["var(--font-open-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
                mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
            },
        },
    },
    plugins: [],
};

export default config;
