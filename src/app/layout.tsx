import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider, ThemeInitScript } from "@jensbouma123/acciva-ui/theme";
import { ToastProvider } from "@jensbouma123/acciva-ui";
// NOTE: the acciva-ui token/base CSS is imported from `globals.css`, not here —
// Tailwind can only register its `@theme` utilities in the file it processes.
import "./globals.css";
import { UpdateBanner } from "@/components/UpdateBanner";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { LifecycleClient } from "@/components/lifecycle/LifecycleClient";
import { MeetingsSync } from "@/components/lifecycle/MeetingsSync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Meeting Noter", template: "%s · Meeting Noter" },
  description: "Live meeting transcripts with speaker labels, processed on your device.",
};

// `viewportFit: cover` is what makes the `env(safe-area-inset-*)` offsets on
// the dock and rails resolve to real values on notched phones.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e2eae6" },
    { media: "(prefers-color-scheme: dark)", color: "#060a08" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="nl"
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeInitScript />
      </head>
      <body className="min-h-dvh h-full flex flex-col bg-background text-foreground selection:bg-primary-100 selection:text-primary-900">
        <I18nProvider>
          <ThemeProvider>
            <ToastProvider position="bottom-right">
              <UpdateBanner />
              <LifecycleClient />
              <MeetingsSync />
              {children}
            </ToastProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
