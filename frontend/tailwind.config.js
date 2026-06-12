/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F7F6F3',
        surface: '#FFFFFF',
        'text-primary': '#0F0F0F',
        muted: '#6B6B6B',
        accent: '#0A0A0A',
        danger: {
          DEFAULT: '#D93025',
          bg: '#FFF5F5',
        },
        warning: {
          DEFAULT: '#C27B00',
          bg: '#FFFAED',
        },
        success: {
          DEFAULT: '#1A7A4A',
          bg: '#F0FAF5',
        },
        info: {
          DEFAULT: '#1A5FC8',
          bg: '#F0F5FF',
        },
      },
    },
  },
  plugins: [],
}
