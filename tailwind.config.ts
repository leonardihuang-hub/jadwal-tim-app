import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#E2E8F0",
        paper: "#020617",
        surface: "#0F172A",
        line: "#1E293B",
        accent: "#6366F1",
        danger: "#F87171",
        warning: "#FBBF24"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
