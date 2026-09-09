/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: { 
          950:"#0B1220", 
          900:"#0F1B2D", 
          800:"#16273F", 
          700:"#1F3450", 
          600:"#2C4A6E" 
        },
        signal: { 
          new:"#E0922B", 
          progress:"#2F6FED", 
          done:"#1C9A6C", 
          urgent:"#D6483B" 
        },
      },
      fontFamily: { 
        sans: ["Inter","system-ui","sans-serif"] 
      },
    },
  },
  plugins: [],
}
