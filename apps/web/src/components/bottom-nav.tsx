import { Link } from "@tanstack/react-router";
import { useAuth } from "../features/auth/api/use-auth";
import { NAV_ITEMS } from "./nav-items";

/**
 * Barre d'onglets **mobile** (masquée dès `md`). Navigation à portée de pouce, un
 * seul geste par destination. La zone sûre iOS (`safe-area-inset-bottom`) est
 * respectée pour ne pas passer sous la barre système.
 */
export function BottomNav() {
  const { isAuthenticated } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.auth || isAuthenticated);

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map(({ to, short, icon: Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: exact ?? false }}
              activeProps={{ "aria-current": "page", className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors hover:text-foreground"
            >
              <Icon className="h-5 w-5" />
              <span>{short}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
