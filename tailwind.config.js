/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#F59E0B",
        // Default Colors
        white: "#ffffff",
        red: "#ee3030",
        // Gray Scale
        gray: {
          900: "#1a1a1a",
          800: "#505050",
          700: "#767676",
          600: "#999999",
          500: "#d0d0d0",
          400: "#e3e3e3",
          300: "#f7f8f9",
          200: "#fafafa",
        },
        // Main Colors
        main: {
          900: "#664318",
          800: "#b8761a",
          700: "#ffc83a",
          600: "#feefd1",
          500: "#fff6e5",
          400: "#fff0bb",
          300: "#ffb800",
        },
        // Sub Colors
        sub: {
          900: "#ff840f",
          800: "#0877ff",
        },
        // Footer Colors
        footer: {
          active: "#ffa200",
          inactive: "#2a2c33",
        },
      },
    },
  },
  plugins: [],
};
