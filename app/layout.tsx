// /app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Layout from "@/components/Layout";

export const metadata: Metadata = {
  title: "PwnTrends – Cyber Security, CTF & Open Source Community",
  description:
    "A social platform for cyber security people, ethical hackers, CTF players, and open source builders. Share write-ups, projects and knowledge.",
  metadataBase: new URL("https://yourdomain.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Layout>{children}</Layout>
      </body>
    </html>
  );
}
