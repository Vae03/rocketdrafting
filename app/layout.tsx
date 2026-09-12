import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "./draft-upgrades.css";

export const metadata: Metadata = {
  title: "RocketLeagueDraft",
  description: "Draft your all-time RLCS roster and simulate the playoffs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
