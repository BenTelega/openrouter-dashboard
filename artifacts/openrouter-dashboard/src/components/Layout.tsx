import { useLocation } from "wouter";
import { MessageSquare, Cpu, Settings, Sun, Moon, Zap } from "lucide-react";
import { useTheme } from "@/lib/store";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: "/", icon: MessageSquare, label: "Chat" },
  { path: "/models", icon: Cpu, label: "Models" },
  { path: "/settings", icon: Settings, label: "Settings" },
];

export default function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="w-56 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sidebar-foreground tracking-tight">OpenRouter</span>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = path === "/" ? location === "/" : location.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => setLocation(path)}
                data-testid={`nav-${label.toLowerCase()}`}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
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
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
