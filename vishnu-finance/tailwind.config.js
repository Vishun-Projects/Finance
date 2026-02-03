/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: 'class',
	content: [
		'./src/pages/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/components/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/(app)/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/(auth)/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/admin/**/*.{js,ts,jsx,tsx,mdx}',
		'./src/app/api/**/*.{js,ts,jsx,tsx,mdx}',
	],
	future: {
		hoverOnlyWhenSupported: true,
	},
	theme: {
		extend: {
			colors: {
				// Design System Specs
				"pure-black": "#000000",
				"surface-secondary": "#050505",
				"surface-card": "#0a0a0a",
				"border-main": "#262626",
				"zinc-muted": "#a1a1aa",
				"zinc-custom": "#E4E4E7",
				"neutral-custom": "#171717",

				// Semantic Mappings
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar))',
					foreground: 'hsl(var(--foreground))'
				},
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				'primary-foreground': 'hsl(var(--primary-foreground))',
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				'secondary-foreground': 'hsl(var(--secondary-foreground))',
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				'muted-foreground': 'hsl(var(--muted-foreground))',
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				'accent-foreground': 'hsl(var(--accent-foreground))',
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				'destructive-foreground': 'hsl(var(--destructive-foreground))',
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'card-foreground': 'hsl(var(--card-foreground))',
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				'popover-foreground': 'hsl(var(--popover-foreground))',
				success: 'hsl(var(--success))',
				'success-foreground': 'hsl(var(--success-foreground))',
				warning: 'hsl(var(--warning))',
				'warning-foreground': 'hsl(var(--warning-foreground))',
				info: 'hsl(var(--info))',
				'info-foreground': 'hsl(var(--info-foreground))',
				error: 'hsl(var(--error))',
				'error-foreground': 'hsl(var(--error-foreground))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			fontFamily: {
				"display": ["var(--font-newsreader)", "Newsreader", "serif"],
				"sans": ["var(--font-sans)", "Inter", "sans-serif"],
				"mono": ["var(--font-mono)", "JetBrains Mono", "monospace"]
			},
			animation: {
				'fade-in': 'fadeIn 0.3s ease-out',
				'slide-up': 'slideUp 0.3s ease-out',
				'slide-in': 'slideIn 0.2s ease-out',
				'scale-in': 'scaleIn 0.2s ease-out'
			},
			keyframes: {
				fadeIn: {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				slideUp: {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				slideIn: {
					'0%': {
						opacity: '0',
						transform: 'translateX(-10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				scaleIn: {
					'0%': {
						opacity: '0',
						transform: 'scale(0.95)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				}
			},
			transitionDuration: {
				'200': '200ms',
				'300': '300ms'
			},
			boxShadow: {
				sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
				md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
				lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
	corePlugins: {
		preflight: true,
		container: false,
	},
}
