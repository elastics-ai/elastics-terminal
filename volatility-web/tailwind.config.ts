import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Chart colors from globals.css
        chart: {
          primary: "hsl(var(--chart-primary))",
          secondary: "hsl(var(--chart-secondary))",
          tertiary: "hsl(var(--chart-tertiary))",
          quaternary: "hsl(var(--chart-quaternary))",
          "portfolio-1": "hsl(var(--chart-portfolio-1))",
          "portfolio-2": "hsl(var(--chart-portfolio-2))",
          "portfolio-3": "hsl(var(--chart-portfolio-3))",
          "risk-low": "hsl(var(--chart-risk-low))",
          "risk-medium": "hsl(var(--chart-risk-medium))",
          "risk-high": "hsl(var(--chart-risk-high))",
          "surface-1": "hsl(var(--chart-surface-1))",
          "surface-2": "hsl(var(--chart-surface-2))",
          "surface-3": "hsl(var(--chart-surface-3))",
          crypto: "hsl(var(--chart-crypto))",
          options: "hsl(var(--chart-options))",
          volume: "hsl(var(--chart-volume))",
        },
        // Status colors for consistency
        status: {
          critical: "hsl(var(--critical))",
          "critical-soft": "hsl(var(--critical-soft))",
          warning: "hsl(var(--warning))",
          "warning-soft": "hsl(var(--warning-soft))",
          info: "hsl(var(--info))",
          "info-soft": "hsl(var(--info-soft))",
          success: "hsl(var(--success))",
          "success-soft": "hsl(var(--success-soft))",
        },
        // Bloomberg terminal colors
        bloomberg: {
          amber: "#FF8800",
          background: "#000000",
          foreground: "#FF8800",
          green: "#00FF00",
          red: "#FF0000",
          blue: "#0080FF",
          gray: "#808080",
          yellow: "#FFFF00",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        blink: "blink 1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;