/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#111827',
        paper: '#fffdf8',
        line: '#e6e2d8',
        primary: '#1f6feb',
        progress: '#1fb653',
        coral: '#f26b4f',
        amber: '#f5b942'
      },
      boxShadow: {
        soft: '0 20px 45px rgba(31, 41, 55, 0.10)'
      }
    }
  },
  plugins: []
};
