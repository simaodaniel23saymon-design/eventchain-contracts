import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        black:   '#06060E',
        deep:    '#0C0C18',
        surface: '#111122',
        gold:    '#D4AF5A',
        'gold-hot': '#F0C060',
        'gold-dim': 'rgba(212,175,90,0.35)',
        'text-ec':  '#E8E4D8',
        'text-mid': 'rgba(232,228,216,0.72)',
        'text-dim': 'rgba(232,228,216,0.45)',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        sans:    ['Outfit', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}

export default config
