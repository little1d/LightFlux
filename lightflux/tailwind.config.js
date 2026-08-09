/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F5FA',
        ink: '#202136',
        primary: '#6759E8',
        surface: '#FFFFFF',
      },
    },
  },
  plugins: [],
};
