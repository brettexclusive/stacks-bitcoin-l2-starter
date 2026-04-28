import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stacks Bitcoin L2 Starter",
  description: "A wallet-gated starter app for building on Stacks.",
  other: {
    "talentapp:project_verification":
      "abfc4ce60380c22e085ef9d10fafb184154b879ab936af68ab69d431920ec6d97182b69cb29e87342264dc9e3919bdee272f43a9b0717b0a8aaf974df2eebfdd"
  }
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
