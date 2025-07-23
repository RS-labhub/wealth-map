// app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CopilotKit } from "@copilotkit/react-core"; 
import "@/lib/styles/styles.css"
import { SessionProvider } from "next-auth/react"
import { FloatingChatButton } from "@/components/FloatingChatButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Wealth Compass",
  description: "Wealth Compass is a platform for wealth management and property analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.maptiler.com/maptiler-sdk-js/v3.2.0/maptiler-sdk.umd.min.js"></script>
        <link href="https://cdn.maptiler.com/maptiler-sdk-js/v3.2.0/maptiler-sdk.css" rel="stylesheet" />
        <script src="https://cdn.maptiler.com/maptiler-geocoding-control/v2.1.4/maptilersdk.umd.js"></script>
        <link href="https://cdn.maptiler.com/maptiler-geocoding-control/v2.1.4/style.css" rel="stylesheet"></link>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white-50`}
      >
        <SessionProvider>
          <CopilotKit publicApiKey={process.env.NEXT_PUBLIC_COPILOT_CLOUD_PUBLIC_API_KEY}> 
            {children}
          </CopilotKit>
        </SessionProvider>
      </body>
    </html>
  );
}