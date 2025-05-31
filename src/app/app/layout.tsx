
"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/custom-components/app-sidebar";
import "@/lib/styles/styles.css";
import { FloatingChatButton } from "@/components/FloatingChatButton";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/app/employee/home";

  return (
      <div className="flex h-screen overflow-hidden">
        <AppSidebar />
        <main
          className={`flex-1 p-4 transition-all duration-300 ease-in-out ${
            isHome ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {children}
        </main>
        <FloatingChatButton />
      </div>
  );
}
