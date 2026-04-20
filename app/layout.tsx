import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Flashcards",
  description: "Study with flashcards and challenges",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div style={{ paddingBottom: "70px" }}>{children}</div>
        </Providers>
      </body>
    </html>
  );
}
