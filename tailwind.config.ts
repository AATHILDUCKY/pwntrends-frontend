import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#e3f2ff",
          100: "#b9d6ff",
          200: "#8fb9ff",
          300: "#659cff",
          400: "#3b7fff",
          500: "#1f63e6",
          600: "#154dc0",
          700: "#0f3890",
          800: "#082260",
          900: "#020d33"
        }
      }
    }
  },
  plugins: []
};

export default config;
