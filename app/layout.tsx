import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SSX Isabel V1",
  description: "Isabel's SSX office and Scout Engine control center.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
