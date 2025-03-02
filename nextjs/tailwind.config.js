/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#05060d",
        purp: "#a855f7",
        muted: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "rgb(255 255 255)",
          200: "rgb(229 229 229)",
          500: "rgb(115 115 115)",
          600: "rgba(82, 82, 82, .8)",
          700: "rgb(64 64 64)",
          800: "rgb(38 38 38)",
          900: "hsl(0 0% 9%)",
          950: "hsl(0 0% 4%)",
        },
      },
    },
  },
  plugins: [],
};
