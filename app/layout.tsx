import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Orbitron } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata: Metadata = {
  title: 'E.PC — eSports Center Booking',
  description: 'Mongolian eSports centers — find, book, and play at the best gaming halls near you.',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#00e0ff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="mn"
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
