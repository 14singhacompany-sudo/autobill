import { Sidebar } from "@/components/layout/Sidebar";
import { Toaster } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-gray-50">
      <Sidebar />
      <main className="dashboard-main min-w-0 flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      <Toaster />
    </div>
  );
}
