import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <Providers>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="lg:pl-64">
          <div className="pt-14 lg:pt-0">
            <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8 max-w-[1200px] mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </Providers>
  );
}
