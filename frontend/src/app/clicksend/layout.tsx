import type { Metadata } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "ClickSend — Protege tu WhatsApp de ventas con API oficial de Meta",
  description: "Bot 24/7, API oficial de Meta, Click-to-WhatsApp nativo. Deja de perder clientes por responder tarde. 14 días gratis.",
  openGraph: {
    title: "ClickSend — Protege tu WhatsApp de ventas",
    description: "API oficial de Meta, bot 24/7 y Click-to-WhatsApp — todo en uno. 14 días gratis.",
    url: "https://www.crmcontactsop.uk/clicksend",
    type: "website",
  },
};

export default function ClickSendLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', 'TU_PIXEL_ID');
        fbq('track', 'PageView');
      `}</Script>
      {children}
    </>
  );
}
