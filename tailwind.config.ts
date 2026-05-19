import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Brand Colors
                brand: {
                    primary: '#e34242',
                    'primary-light': '#ef4444',
                    'primary-dark': '#b91c1c',
                    50: '#F8FAFC',
                    100: '#F1F5F9',
                },
                // Neutral Scale
                neutral: {
                    50: '#FAFAFA',
                    100: '#F5F5F5',
                    200: '#E5E5E5',
                    300: '#D4D4D4',
                    400: '#A3A3A3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                },
                // Semantic Colors
                success: {
                    DEFAULT: '#10B981',
                    light: '#D1FAE5',
                    dark: '#059669',
                },
                warning: {
                    DEFAULT: '#F59E0B',
                    light: '#FEF3C7',
                    dark: '#D97706',
                },
                error: {
                    DEFAULT: '#EF4444',
                    light: '#FEE2E2',
                    dark: '#B91C1C',
                },
                info: {
                    DEFAULT: '#e34242',
                    light: '#F8FAFC',
                    dark: '#b91c1c',
                },
                // Legacy wine alias preserved for backward compatibility
                wine: {
                    50: '#F8FAFC',
                    100: '#F1F5F9',
                    200: '#E2E8F0',
                    300: '#CBD5E1',
                    400: '#94A3B8',
                    500: '#e34242',
                    600: '#b91c1c',
                    700: '#991b1b',
                    800: '#7f1d1d',
                    900: '#450a0a',
                    950: '#450a0a',
                    DEFAULT: '#e34242',
                    light: '#ef4444',
                    dark: '#b91c1c',
                },
            },
            boxShadow: {
                'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            },
            spacing: {
                '0.5': '0.125rem',  // 2px
                '1.5': '0.375rem',  // 6px
                '2.5': '0.625rem',  // 10px
                '3.5': '0.875rem',  // 14px
                '4.5': '1.125rem',  // 18px
                '5.5': '1.375rem',  // 22px
                '6.5': '1.625rem',  // 26px
                '7.5': '1.875rem',  // 30px
            },
            borderRadius: {
                'sm': '0.375rem',
                'md': '0.5rem',
                'lg': '0.75rem',
                'xl': '1rem',
                '2xl': '1.5rem',
            },
        },
    },
    plugins: [],
};
export default config;
