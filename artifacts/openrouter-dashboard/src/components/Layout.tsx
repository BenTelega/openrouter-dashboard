import { useLocation } from "wouter";
import { LayoutDashboard, Calculator, Key, Settings, Sun, Moon, Zap } from "lucide-react";
import { useTheme } from "@/lib/store";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Главная" },
  { path: "/keys", icon: Key, label: "Ключи" },
  { path: "/calculator", icon: Calculator, label: "Калькулятор" },
  { path: "/settings", icon: Settings, label: "Настройки" },
];

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Боковая панель (десктоп) ────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex-col">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">Bentelega</span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => setLocation(path)}
                data-testid={`nav-${path === "/" ? "home" : path.slice(1)}`}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button
            data-testid="toggle-theme"
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </button>
        </div>
      </aside>

      {/* ── Шапка (мобильный) ────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-12 flex items-center justify-between px-4 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sidebar-foreground text-sm tracking-tight">Bentelega</span>
        </div>
        <button
          data-testid="toggle-theme-mobile"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-md flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* ── Контент ──────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden flex flex-col pt-12 md:pt-0 pb-16 md:pb-0">
        {children}
      </main>

      {/* ── Нижняя навигация (мобильный) ─────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-sidebar border-t border-sidebar-border flex items-center">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => setLocation(path)}
              data-testid={`nav-mobile-${path === "/" ? "home" : path.slice(1)}`}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${
                isActive ? "text-primary" : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
