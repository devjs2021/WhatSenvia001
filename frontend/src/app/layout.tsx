import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ClickSend - Solución Inteligente de Comunicación",
  description: "Conecta con tus clientes a través de múltiples canales de mensajería",
  manifest: "/manifest.json",
  themeColor: "#10B981",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ClickSend",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            src="https://www.facebook.com/tr?id=846621221464509&ev=PageView&noscript=1"
          />
        </noscript>
      </head>
      <body className="font-sans antialiased">
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '846621221464509');
            fbq('track', 'PageView');
          `}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
