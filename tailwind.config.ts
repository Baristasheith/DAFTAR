import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0A0C10",
        card: "#191E25",
        accent: "#D6FF3F",
        ink: "#F4F7F0",
        muted: "#A0A7B2",
        line: "#303740",
        danger: "#FF8A80",
      },
      fontFamily: {
        sans: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise .6s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
