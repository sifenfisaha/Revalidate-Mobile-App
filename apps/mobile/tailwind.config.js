/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],

  // NativeWind uses class-based dark mode
  darkMode: "class",

  theme: {
    extend: {
      colors: {
        /* ===== Brand ===== */
        primary: {
          DEFAULT: "#2b5f9e",
          50: "#e8f4f9",
          100: "#d1e9f3",
          200: "#a3d3e7",
          300: "#75b3db",
          400: "#4893cf",
          500: "#2596be",
          600: "#1f7ea6",
          700: "#1b6f8c",
          800: "#145363",
          900: "#0d3842",
        },

        /* ===== App Backgrounds ===== */
        background: {
          light: "#ffffff",
          dark: "#0b1220",
        },

        /* ===== Text ===== */
        foreground: {
          light: "#0f172a",
          dark: "#e5e7eb",
        },

        /* ===== Borders / Surfaces ===== */
        surface: {
          light: "#f8fafc",
          dark: "#111827",
        },

        /* ===== Premium / Gold ===== */
        premium: {
          DEFAULT: "#D4AF37",
          50: "#F9F6F0",
          100: "#F4EED9",
          200: "#E8D9B3",
          300: "#DCC48D",
          400: "#D4AF37",
          500: "#B8941F",
          600: "#9A7A1A",
          700: "#7C6015",
          800: "#5E4610",
          900: "#402C0B",
        },
        gold: {
          DEFAULT: "#FFD700",
          light: "#FFE44D",
          dark: "#B8860B",
          shimmer: "#FFF8DC",
        },
      },
    },
  },
  plugins: [],
};
