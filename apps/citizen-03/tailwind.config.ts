import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
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
      },
      animation: {
        "slide-up": "slide-up 0.3s cubic-bezier(0.25, 0.1, 0.25, 1.4)",
        "fade-in": "fade-in 0.2s ease-out",
        "bounce-dot": "bounce-dot 1.4s infinite ease-in-out both",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
