import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7C3AED",
          50: "#F5F3FF", 100: "#EDE9FE", 500: "#7C3AED", 600: "#6D28D9", 700: "#5B21B6"
        },
        accent: { DEFAULT: "#F59E0B" }
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] }
    }
  },
  plugins: []
};
export default config;
