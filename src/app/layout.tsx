import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Top Zuivel Orders",
  description: "Bestelportal voor zakelijke klanten",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <div className="flex-1">
          {children}
        </div>
        <footer className="py-6 border-t border-border mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            created by <a href="https://compedy.com" target="_blank" rel="noopener noreferrer" className="hover:underline font-medium text-foreground">Compedy</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
