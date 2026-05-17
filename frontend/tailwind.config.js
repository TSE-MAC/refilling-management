/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
        extend: {
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                colors: {
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        primary: {
                                DEFAULT: 'hsl(var(--primary))',
                                foreground: 'hsl(var(--primary-foreground))'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        ops: {
                                navy: '#183153',
                                'navy-dark': '#0f2038',
                                'navy-light': '#224b7a',
                                blue: '#224b7a',
                                bg: '#f3f4f6',
                                surface: '#ffffff',
                                ink: '#0b1c33',
                                'ink-2': '#1f2a44',
                                muted: '#6b7280',
                                'line': '#e5e7eb',
                                red: '#dc2626',
                                'red-bg': '#fef2f2',
                                green: '#16a34a',
                                'green-bg': '#f0fdf4',
                                amber: '#d97706',
                                'amber-bg': '#fffbeb',
                        },
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        }
                },
                fontFamily: {
                        display: ['Archivo', 'system-ui', 'sans-serif'],
                        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
                },
                boxShadow: {
                        'ops': '0 1px 2px rgba(15, 32, 56, 0.04), 0 1px 3px rgba(15, 32, 56, 0.06)',
                        'ops-lg': '0 4px 12px -2px rgba(15, 32, 56, 0.08), 0 2px 6px -1px rgba(15, 32, 56, 0.04)',
                        'ops-up': '0 -4px 12px -2px rgba(15, 32, 56, 0.06)',
                        'ops-fab': '0 8px 24px -4px rgba(24, 49, 83, 0.4), 0 4px 8px -2px rgba(24, 49, 83, 0.2)',
                },
                keyframes: {
                        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
                        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
                        'pulse-dot': {
                                '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                                '50%': { opacity: '0.5', transform: 'scale(1.15)' }
                        },
                        'shimmer': {
                                '0%': { backgroundPosition: '-200% 0' },
                                '100%': { backgroundPosition: '200% 0' }
                        }
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite',
                        'shimmer': 'shimmer 1.6s linear infinite',
                }
        }
  },
  plugins: [require("tailwindcss-animate")],
};
