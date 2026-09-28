import type { Metadata } from "next";
import "lenis/dist/lenis.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Nothin’ — A different perspective",
  description:
    "An independent creative studio. Identity, culture and experiences with a different perspective.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
