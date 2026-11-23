import type { Metadata, Viewport } from 'next'
import { Inter, Vazirmatn } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-en',
  display: 'swap',
})

const vazir = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-fa',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Dolat Zaban',
  description: 'English-Persian dictionary and translator',
  applicationName: 'Dolat Zaban',
  icons: {
    icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon.png', sizes: '512x512', type: 'image/png' }],
    apple: '/icon.png',
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#057855' },
    { media: '(prefers-color-scheme: dark)', color: '#04412f' },
  ],
}

const initScript = `(function(){try{var s=(JSON.parse(localStorage.getItem('dolatzaban-settings')||'{}').state)||{};var d=document.documentElement;if(s.lang==='fa'){d.lang='fa';d.dir='rtl'}else{d.lang='en';d.dir='ltr'}var m=s.mode||'system';var dark=m==='dark'||(m!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark){d.classList.add('dark')}var p=s.palette||'green';if(p!=='green'){d.setAttribute('data-theme',p)}var ts=[14,15,16,17.5,19];if(typeof s.textSize==='number'&&s.textSize!==2&&ts[s.textSize]){d.style.fontSize=ts[s.textSize]+'px'}}catch(e){}})()`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body className={`${inter.variable} ${vazir.variable} antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  )
}
