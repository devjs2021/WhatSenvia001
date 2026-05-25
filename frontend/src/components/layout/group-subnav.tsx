"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { findGroupByHref } from "@/config/dashboard-navigation";

export function GroupSubNav() {
  const pathname = usePathname();

  const group = findGroupByHref(pathname);
  if (!group || group.children.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1.5 overflow-x-auto">
      {group.children.map((child) => {
        const isActive = pathname === child.href || pathname.startsWith(child.href + "/");
        return (
          <Link
            key={child.href}
            href={child.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-150",
              isActive
                ? "bg-emerald-50 text-emerald-600 shadow-sm"
                : "text-slate-400 hover:text-slate-700 hover:bg-slate-50"
            )}
          >
            <child.icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{child.nameKey}</span>
          </Link>
        );
      })}
    </nav>
  );
}
