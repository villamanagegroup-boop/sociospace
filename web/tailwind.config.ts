import type { Config } from 'tailwindcss';

// Brand tokens mirror the existing /style.css design system. Keep these
// in sync if /style.css changes (or we eventually retire that file once
// every public page is in Next.js).
const config: Config = {
  content: [
    './app/**/*.{ts,tsx,mdx}',
    './components/**/*.{ts,tsx,mdx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#161616',
          2: '#2A2A2A',
          3: '#5A5A5A',
          4: '#8C8C8C',
          5: '#B5B5B5'
        },
        cream: {
          DEFAULT: '#FFF7DE',
          2: '#FFF1C8'
        },
        yellow: {
          DEFAULT: '#FCD735',
          deep: '#F4C700',
          soft: '#FFF3A8'
        },
        'pink-bright': '#FF5C95',
        pink: {
          DEFAULT: '#FF7BA8',
          soft: '#FFE4ED'
        },
        mint: {
          DEFAULT: '#7FE5C2',
          deep: '#3DBD9C',
          soft: '#DDF6EC'
        },
        orange: {
          DEFAULT: '#FF8C5A',
          soft: '#FFE3D2'
        },
        lilac: {
          DEFAULT: '#C8B4E0',
          soft: '#ECE2F6'
        },
        peach: '#FFC9A8'
      },
      fontFamily: {
        display: ['"Archivo Black"', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
        script: ['Caveat', 'cursive']
      },
      borderRadius: {
        pill: '999px'
      },
      boxShadow: {
        'ink-2': '2px 2px 0 #161616',
        'ink-4': '4px 4px 0 #161616',
        'ink-6': '6px 6px 0 #161616',
        'ink-8': '8px 8px 0 #161616'
      }
    }
  },
  plugins: []
};

export default config;
