import { TimezoneSync } from "@/components/auth/timezone-sync";
import { LevelUpProvider } from "@/components/level-up/level-up-provider";
import { TierTheme } from "@/components/level-up/tier-theme";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { MoteurProvider } from "@/lib/moteur-store";
import { ProfileProvider } from "@/lib/profile-store";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});
export const metadata: Metadata = {
  title: "THEMILION SYSTEM — Ta vie est un RPG",
  description:
    "THEMILION SYSTEM transforme tes objectifs en missions, ta discipline en XP et ta progression en rangs. XP, niveaux, streaks, coach IA, Performance Score et Life Map sur neuf domaines de vie. Rejoins la liste d'attente.",
  appleWebApp: { capable: true, title: "THEMILION", statusBarStyle: "black-translucent" },
  icons: { apple: "/pwa-icon/180" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#04060B",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontMono.variable
        )}
      >
        {/* Mode sombre forcé : aucune bascule clair/sombre possible. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          forcedTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ProfileProvider>
            <MoteurProvider>
              <LevelUpProvider>
                <TierTheme />
                <TimezoneSync />
                {children}
              </LevelUpProvider>
            </MoteurProvider>
          </ProfileProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
