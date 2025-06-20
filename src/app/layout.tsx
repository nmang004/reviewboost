import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TeamProvider } from "@/contexts/TeamContext";
import ProfileInitializer from "@/components/auth/ProfileInitializer";
import DataMigration from "@/components/auth/DataMigration";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "ReviewBoost - Gamify Employee Reviews",
  description: "Motivate your team to collect customer reviews with gamification and rewards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${playfairDisplay.variable} font-sans antialiased`}
      >
        <TeamProvider>
          <ProfileInitializer />
          <DataMigration />
          <Header />
          <main className="pt-16 min-h-screen">{children}</main>
          <Footer />
        </TeamProvider>
      </body>
    </html>
  );
}
