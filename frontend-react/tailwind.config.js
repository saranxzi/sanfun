/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          light: '#FDFBF7',
          DEFAULT: '#F5EFEB',
          warm: '#EFE7DF',
          dark: '#E2D5C7',
        },
        ink: {
          faint: '#786C65',
          muted: '#4A403A',
          DEFAULT: '#1F1916',
          dark: '#14100E',
        },
        arcade: {
          terracotta: '#E25241',
          mustard: '#F5A623',
          cobalt: '#2B6CB0',
          emerald: '#2A9D8F',
          plum: '#8E44AD',
          peach: '#FF8E72',
          cream: '#FFF9E6',
        },
      },
      boxShadow: {
        'retro-sm': '2px 2px 0px #1F1916',
        'retro': '4px 4px 0px #1F1916',
        'retro-lg': '6px 6px 0px #1F1916',
        'retro-xl': '8px 8px 0px #1F1916',
        'retro-press': '0px 0px 0px #1F1916',
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
