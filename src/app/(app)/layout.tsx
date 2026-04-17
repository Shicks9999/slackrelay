import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/engines", label: "Engines" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const skipAuth = process.env.NEXT_PUBLIC_SKIP_AUTH === "true";

  let user: { email?: string } | null = null;
  if (!skipAuth) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
    if (!user) {
      redirect("/login");
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex h-14 items-center border-b border-zinc-200 px-4 dark:border-zinc-800">
          <Link href="/dashboard" className="text-lg font-semibold">
            SlackRelay
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
          <p className="truncate px-3 text-xs text-zinc-500">
            {user?.email ?? "MVP Tester"}
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
