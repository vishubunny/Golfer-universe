import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";

export default async function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (user && user.role === "admin") redirect("/admin");
  if (user && user.role !== "admin") redirect("/dashboard");
  return <>{children}</>;
}
