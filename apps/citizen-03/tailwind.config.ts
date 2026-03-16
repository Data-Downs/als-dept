import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "govuk-blue": "#1d70b8",
        "govuk-dark-blue": "#003078",
        "govuk-black": "#0b0c0c",
        "govuk-white": "#ffffff",
        "govuk-red": "#d4351c",
        "govuk-yellow": "#ffdd00",
        "govuk-green": "#00703c",
        "govuk-light-grey": "#f3f2f1",
        "govuk-mid-grey": "#b1b4b6",
        "govuk-dark-grey": "#505a5f",
        "govuk-page-bg": "#eaf1f7",
        "govuk-purple": "#912b88",
        "govuk-orange": "#f47738",
      },
      fontFamily: {
        govuk: ['"GDS Transport"', '"nta"', "Arial", "sans-serif"],
        system: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"Helvetica Neue"',
          "Arial",
          "sans-serif",
        ],
        mono: ['"SF Mono"', '"Menlo"', '"Consolas"', "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      keyframes: {
        "slide-up": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "bounce-dot": {
          "0%, 80%, 100%": { transform: "scale(0)" },
          "40%": { transform: "scale(1)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "toast-in": {
          "0%": { opacity: "0", transform: "translateY(16px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "toast-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(-8px)" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.3s cubic-bezier(0.25, 0.1, 0.25, 1.4)",
        "fade-in": "fade-in 0.2s ease-out",
        "bounce-dot": "bounce-dot 1.4s infinite ease-in-out both",
        "slide-in-right": "slide-in-right 0.25s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
        "toast-in": "toast-in 0.3s ease-out",
        "toast-out": "toast-out 0.2s ease-in forwards",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
