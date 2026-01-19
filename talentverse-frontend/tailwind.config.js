/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4f46e5",   // indigo-600
        secondary: "#6366f1", // indigo-500
        dark: "#0f172a",
        muted: "#64748b",
        surface: "#f8fafc"
      }
    }
  },
  plugins: [],
};
