import { useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutGrid,
  BookOpen,
  ClipboardList,
  Wallet,
  History,
  Settings,
  LogOut,
  RefreshCw,
  Menu,
} from "lucide-react";
import type { Snapshot } from "../../shared/contracts";
import Button from "../components/ui/ActionButton";
import { Badge } from "../components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "../components/ui/sheet";
import { Separator } from "../components/ui/separator";
import { ThemeSwitcher } from "../features/ThemeControl";
const nav = [
  ["/order", "Đặt cơm", LayoutGrid],
  ["/menus", "Quản lý menu", BookOpen],
  ["/summary", "Tổng hợp đơn", ClipboardList],
  ["/finance", "Công nợ", Wallet],
  ["/audit", "Nhật ký", History],
  ["/settings", "Cài đặt", Settings],
] as const;
export default function AppShell({
  children,
  member,
  session,
  preview,
  connected,
  onRefresh,
  onLogout,
}: {
  children: ReactNode;
  member: Snapshot["member"] | undefined;
  session: boolean;
  preview: boolean;
  connected: boolean;
  onRefresh: () => void;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const links = (
    <nav className="grid gap-1 p-3">
      {nav
        .filter(([path]) => member?.role !== "employee" || path !== "/menus")
        .map(([path, label, Icon]) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
    </nav>
  );
  const brand = (
    <NavLink
      to="/order"
      className="flex items-center gap-3 p-5 pr-14 font-semibold text-lg md:pr-5"
    >
      <img
        src="/brand/logo-mark.png"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-lg"
      />
      Cơm Của Nghĩa
    </NavLink>
  );
  const profile = (
    <div className="flex items-center gap-3 p-4">
      <span className="avatar">{member?.display_name[0] ?? "N"}</span>
      <div className="min-w-0 flex-1">
        <b className="block truncate text-sm">
          {member?.display_name ?? "Xin chào"}
        </b>
        <small className="text-muted-foreground">
          {member?.role === "admin" ? "Quản trị viên" : "Rivercrane"}
        </small>
      </div>
      {session && (
        <Button variant="text" aria-label="Đăng xuất" onClick={onLogout}>
          <LogOut size={16} />
        </Button>
      )}
    </div>
  );
  return (
    <div className="app-canvas min-h-dvh text-foreground">
      <aside className="app-sidebar fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-background md:flex">
        {brand}
        <Separator />
        {links}
        <div className="mt-auto">
          <Separator />
          {profile}
        </div>
      </aside>
      <div className="md:pl-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b bg-background/95 px-4 backdrop-blur md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="text"
                  className="md:hidden"
                  aria-label="Mở điều hướng"
                >
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="app-sidebar w-[min(85vw,20rem)] gap-0 p-0"
              >
                <SheetTitle className="sr-only">Điều hướng</SheetTitle>
                {brand}
                <Separator />
                {links}
                <div className="mt-auto">{profile}</div>
              </SheetContent>
            </Sheet>
            <span className="min-w-0 truncate text-sm font-medium">
              Không gian đặt cơm{" "}
              <span className="text-muted-foreground">· Rivercrane</span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant="outline"
              className="max-w-36 whitespace-normal text-center text-xs"
            >
              {preview
                ? "Dữ liệu mẫu • chỉ xem"
                : connected
                  ? "Đang đồng bộ"
                  : "Chưa kết nối"}
            </Badge>
            <ThemeSwitcher />
            {session && (
              <Button
                variant="text"
                aria-label="Tải lại dữ liệu"
                onClick={onRefresh}
              >
                <RefreshCw size={17} />
              </Button>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 pb-32 md:p-8">
          {children}
        </main>
        <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
          Cơm Của Nghĩa · Bữa trưa cùng nhau
        </footer>
      </div>
    </div>
  );
}
