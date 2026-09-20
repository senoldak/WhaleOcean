import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          abyss: '#05080E',
          deep: '#090E17',
          surface: '#0F1726',
          hover: '#142036',
          border: '#19263E',
          cyan: '#00E5FF',
          blue: '#0070F3',
          red: '#FF3B30',
          green: '#00E676',
          muted: '#7D8B99',
          text: '#F0F6FC',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
