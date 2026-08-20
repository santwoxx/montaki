import type { Metadata, Viewport } from "next";
import { Orbitron, Raleway } from "next/font/google";
import { Analytics } from "@/components/Analytics";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Montaki — Gestão de montagens",
  description: "Organização financeira e de demandas de montagem e desmontagem de móveis",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Montaki",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#171512",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${raleway.variable} ${orbitron.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
