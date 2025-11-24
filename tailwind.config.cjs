/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Poppins', 'sans-serif'],
            },
            colors: {
                brand: {
                    light: 'hsl(140, 80%, 96%)',
                    primary: 'hsl(142, 76%, 36%)', // Explicit HSL Green
                    dark: 'hsl(145, 85%, 20%)', // Deep Forest Green
                }
            },
            keyframes: {
                'fade-in-down': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(-30px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)'
                    },
                },
                'fade-in-up': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(30px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)'
                    },
                },
                'fade-in-left': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateX(-50px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateX(0)'
                    },
                },
                'fade-in-right': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateX(50px)'
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateX(0)'
                    },
                },
                'fade-in': {
                    '0%': {
                        opacity: '0'
                    },
                    '100%': {
                        opacity: '1'
                    },
                }
            },
            animation: {
                'fade-in-down': 'fade-in-down 0.8s ease-out forwards',
                'fade-in-up': 'fade-in-up 0.8s ease-out forwards',
                'fade-in-left': 'fade-in-left 0.8s ease-out forwards',
                'fade-in-right': 'fade-in-right 0.8s ease-out forwards',
                'fade-in': 'fade-in 1.2s ease-out forwards',
            }
        },
    },
    plugins: [],
}