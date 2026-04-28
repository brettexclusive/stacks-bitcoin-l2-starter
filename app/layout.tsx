import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stacks Bitcoin L2 Starter",
  description: "A wallet-gated starter app for building on Stacks."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
