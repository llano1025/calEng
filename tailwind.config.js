// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Or your main HTML file
    "./src/*.{js,ts,jsx,tsx}", // **Crucial:** Include all relevant file types in src
    "./src/**/*.{js,ts,jsx,tsx}", // **Crucial:** Include all relevant file types in src
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}