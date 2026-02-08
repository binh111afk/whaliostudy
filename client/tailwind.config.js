/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#134691",
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'), // 👈 Thêm dòng này để hỗ trợ class 'prose'
  ],
}