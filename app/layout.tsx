import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GIS — Geospatial Intelligence Studio",
  description: "A modern open geospatial intelligence and mapping platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}