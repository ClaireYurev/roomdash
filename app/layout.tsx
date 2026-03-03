import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoomDash — Conference Room Dashboard",
  description: "LA Office conference room management dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <Navbar />
            <main className="max-w-screen-2xl mx-auto px-4 py-6">
              {children}
            </main>
          </div>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
