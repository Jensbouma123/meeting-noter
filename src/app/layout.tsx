import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider, ThemeInitScript } from "@jensbouma123/acciva-ui/theme";
import { ToastProvider } from "@jensbouma123/acciva-ui";
import "./globals.css";
import { PinThemeSeed } from "@/lib/theme/PinThemeSeed";
import { THEME_SEED } from "@/lib/theme/theme-seed";
import { UpdateBanner } from "@/components/UpdateBanner";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { LifecycleClient } from "@/components/lifecycle/LifecycleClient";
import { MeetingsSync } from "@/components/lifecycle/MeetingsSync";
import { ActiveMeetingReporter } from "@/components/lifecycle/ActiveMeetingReporter";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e3eae4" },
    { media: "(prefers-color-scheme: dark)", color: "#070a07" },
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
        <PinThemeSeed />
        <ThemeInitScript />
      </head>
      <body className="min-h-dvh h-full flex flex-col bg-background text-foreground selection:bg-primary-100 selection:text-primary-900">
        <I18nProvider>
          <ThemeProvider stylesheet={THEME_SEED}>
            <ToastProvider position="bottom-right">
              <UpdateBanner />
              <LifecycleClient />
              <MeetingsSync />
              <ActiveMeetingReporter />
              {children}
            </ToastProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
