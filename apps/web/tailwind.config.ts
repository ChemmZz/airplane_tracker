import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          950: "#0b1220",
        },
      },
    },
  },
  plugins: [],
};

export default config;
