/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.marko'],
  theme: {
    extend: {
      gridTemplateColumns: {
        "main": "300px 1fr",
      },
    },
  },
  plugins: [],
}

