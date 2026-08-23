import './globals.css'
import { ThemeProvider } from '../components/theme-provider'
import ConditionalSidebar from '@/components/sidebar/conditional-sidebar'
import type { Viewport } from 'next'

// Mobile-first: fit the notch so env(safe-area-inset-*) is honoured, and don't
// let iOS zoom the page when a form input is focused.
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#000000',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang='en' suppressHydrationWarning>
            <head>
                <title>Lift Log | Fitness and Gym Progress</title>
            </head>
            <body>
                <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
                >
                <ConditionalSidebar>
                    {children}
                </ConditionalSidebar>
                </ThemeProvider>
            </body>
        </html>
    )
}