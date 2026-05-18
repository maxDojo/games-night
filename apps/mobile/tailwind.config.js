/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF8',
        darkGreen: '#0D1F0F',
        midGreen: '#1A3A1C',
        lightGreen: '#8FAF91',
        goldPrimary: '#C9A84C',
        goldLight: '#E8D5A3',
      },
      fontFamily: {
        playfair: ['PlayfairDisplay_700Bold', 'serif'],
        inter: ['Inter_400Regular', 'sans-serif'],
        interSemi: ['Inter_600SemiBold', 'sans-serif'],
        interBold: ['Inter_700Bold', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
