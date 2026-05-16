import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SidebarV2 } from "@/components/v2/sidebar";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <Providers>
      <div className="relative min-h-screen text-foreground">
        <div className="ambient-shell" />
        <SidebarV2 />
        <main className="relative lg:pl-60 z-10">
          <div className="pt-14 lg:pt-0">
            <div className="px-4 py-6 sm:px-8 lg:px-12 lg:py-10 max-w-[1280px] mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
      <Toaster />
    </Providers>
  );
}
