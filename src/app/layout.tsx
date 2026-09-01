import './globals.css'
import { ThemeProvider } from '../components/theme-provider'
import ConditionalSidebar from '@/components/sidebar/conditional-sidebar'
import type { Metadata, Viewport } from 'next'
import { MotionConfig } from 'framer-motion'

// Mobile-first: fit the notch so env(safe-area-inset-*) is honoured, and don't
// let the browser zoom the page when a form input is focused.
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#0a0a0a',
    // Let the on-screen keyboard shrink the page instead of overlaying it, so a
    // bottom-of-screen element isn't hidden behind it (Android/Chrome; iOS
    // Safari ignores this, which is why dialogs are also top-anchored on mobile).
    interactiveWidget: 'resizes-content',
}

export const metadata: Metadata = {
    title: 'Lift Log | Fitness and Gym Progress',
    description:
        'Track your lifts, log sessions as you train, and watch your progress build.',
    applicationName: 'LiftLog',
    manifest: '/manifest.webmanifest',
    // Lets Android/iOS run the installed app without browser chrome.
    appleWebApp: {
        capable: true,
        title: 'LiftLog',
        statusBarStyle: 'black-translucent',
    },
    formatDetection: {
        // Stop Android from turning rep counts and weights into phone links.
        telephone: false,
    },
    icons: {
        icon: [
            { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        apple: [{ url: '/icons/icon-192.png', sizes: '192x192' }],
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        // Every surface in this app is designed against dark neutrals with
        // hardcoded `text-white` / `bg-neutral-9xx`. Following the OS theme
        // meant a phone in light mode rendered white text on a white page, so
        // the theme is pinned to dark rather than half-supported.
        <html lang='en' className='dark' suppressHydrationWarning>
            <body>
                <ThemeProvider
                    attribute='class'
                    defaultTheme='dark'
                    forcedTheme='dark'
                    enableSystem={false}
                    disableTransitionOnChange
                >
                    {/* Every page fades/slides in via framer-motion. Honour the
                        OS "reduce motion" setting so those transforms are
                        skipped for users who ask for it. */}
                    <MotionConfig reducedMotion='user'>
                        <ConditionalSidebar>
                            {children}
                        </ConditionalSidebar>
                    </MotionConfig>
                </ThemeProvider>
            </body>
        </html>
    )
}
