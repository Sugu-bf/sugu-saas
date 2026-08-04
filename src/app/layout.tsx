import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { SUGU_PRO_NAME, SUGU_PRO_OG_IMAGE, SUGU_PRO_URL } from "@/lib/seo";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Sugu Pro — Le système derrière chaque commande",
    template: `%s | ${SUGU_PRO_NAME}`,
  },
  description: "Sugu Pro relie catalogue, commandes, livraison, paiement et revenus pour les vendeurs et équipes de livraison.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || SUGU_PRO_URL),
  applicationName: SUGU_PRO_NAME,
  authors: [{ name: "Sugu", url: "https://sugu.pro/" }],
  creator: "Sugu",
  publisher: "Sugu",
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    siteName: SUGU_PRO_NAME,
    locale: "fr_BF",
    type: "website",
    images: [{ url: SUGU_PRO_OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [SUGU_PRO_OG_IMAGE] },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SUGU_PRO_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${plusJakartaSans.className} ${plusJakartaSans.variable} antialiased`}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
          <InstallPrompt />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
