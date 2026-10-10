/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        elderGreen: '#15803d',
        elderYellow: '#b45309',
        elderRed: '#b91c1c',
      }
    },
  },
  plugins: [],
}
