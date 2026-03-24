import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Nav } from "@/components/nav"
import { TooltipProvider } from "@/components/ui/tooltip"
import { initializeDatabase } from "@/lib/db"

const inter = Inter({ subsets: ["latin"] })

// Initialize database on server start
initializeDatabase()

export const metadata: Metadata = {
  title: "Teaching Grid Management",
  description: "Manage teaching allocations and staff workloads",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TooltipProvider>
          <div className="min-h-screen bg-gray-50">
            <Nav />
            <main className="container mx-auto px-4 py-6">
              {children}
            </main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  )
}
