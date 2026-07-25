import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sage: {
          50: "#f3f8f1",
          100: "#e3eedf",
          300: "#a9c69c",
          500: "#6f9465",
          700: "#3f5f39"
        },
        mist: "#f8faf4",
        pollen: "#f6dc8f"
      },
      boxShadow: {
        garden: "0 18px 55px rgba(83, 112, 72, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
