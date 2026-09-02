/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: () => ({
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-linear': 'linear-gradient(180deg, var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(var(--tw-gradient-stops))',
      }),
      colors: {
        'purple-custom1': '#603BB0',
        'purple-custom2': '#8562D5',
        'purple-custom3': '#7B57CA',
      },
      width: {
        '1/8': '12.5%',
      }
    }
  },
  plugins: [
  ],
}
