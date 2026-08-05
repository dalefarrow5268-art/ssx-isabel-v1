import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Isabel's Office | SSX",
  description: "A living SSX construction operations office for Isabel.",
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
