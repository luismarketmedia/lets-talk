/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e6f6ff",
          100: "#b3e5ff",
          200: "#80d4ff",
          300: "#4dc3ff",
          400: "#1ab2ff",
          500: "#0fa3e0",
          600: "#0b82c4",
          700: "#0a5c8a",
          800: "#084a6e",
          900: "#063852",
        },
        blue: {
          50: "#e6f6ff",
          100: "#b3e5ff",
          200: "#80d4ff",
          300: "#4dc3ff",
          400: "#1ab2ff",
          500: "#0fa3e0",
          600: "#0b82c4",
          700: "#0a5c8a",
          800: "#084a6e",
          900: "#063852",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "in": "in 0.2s ease-out",
        "out": "out 0.2s ease-in",
        "fade-in": "fade-in 0.2s ease-out",
        "fade-out": "fade-out 0.2s ease-in",
        "zoom-in": "zoom-in 0.2s ease-out",
        "zoom-out": "zoom-out 0.2s ease-in",
        "slide-in-from-left-1/2": "slide-in-from-left-half 0.2s ease-out",
        "slide-in-from-top-[48%]": "slide-in-from-top-half 0.2s ease-out",
        "slide-out-to-left-1/2": "slide-out-to-left-half 0.2s ease-in",
        "slide-out-to-top-[48%]": "slide-out-to-top-half 0.2s ease-in",
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
      },
    },
  },
  plugins: [],
};
