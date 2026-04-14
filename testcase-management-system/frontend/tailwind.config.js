/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#005FB8",
        "secondary": "#00B7C3",
        "tertiary": "#FFB900",
        "background": "#F3F5F7",
        "on-background": "#111827",
        "surface": "#FFFFFF",
        "on-surface": "#111827",
        "on-surface-variant": "#4B5563",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#F9FAFB",
        "surface-container": "#F3F4F6",
        "surface-container-high": "#E5E7EB",
        "surface-container-highest": "#D1D5DB",
        "outline": "#D1D5DB",
        "outline-variant": "#E5E7EB",
        "error": "#D13438",
        "error-container": "#FDE7E9",
        "on-error-container": "#A4262C"
      },
      borderRadius: {
        "DEFAULT": "0.5rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "full": "9999px"
      },
      fontFamily: {
        "headline": ["Manrope", "Inter", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
