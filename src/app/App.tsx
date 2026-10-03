import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import {
  UtensilsCrossed,
  LayoutGrid,
  BookOpen,
  ClipboardList,
  Wallet,
  History,
  Settings as SettingsIcon,
  LogOut,
  ArrowUpRight,
  RefreshCw,
  Leaf,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { snapshot, command } from "../lib/api";
import { createRefresh } from "../lib/refresh";
import type { Snapshot } from "../../shared/contracts";
import { demo } from "../lib/demo";
import Orders from "../features/Orders";
import Menus from "../features/Menus";
import Summary from "../features/Summary";
import Finance from "../features/Finance";
import Audit from "../features/Audit";
import Settings from "../features/Settings";
const nav = [
  ["/order", "Đặt cơm", LayoutGrid],
  ["/menus", "Quản lý menu", BookOpen],
  ["/summary", "Tổng hợp đơn", ClipboardList],
  ["/finance", "Công nợ", Wallet],
  ["/audit", "Nhật ký", History],
  ["/settings", "Cài đặt", SettingsIcon],
] as const;
export default function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [preview, setPreview] = useState(false);
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const refreshRef = useRef<ReturnType<typeof createRefresh<Snapshot>> | null>(
    null,
  );
  const reload = useCallback(
    () => refreshRef.current?.refresh() ?? Promise.resolve(),
    [],
  );
  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }) => setSession(!!data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(!!s);
      if (!s) {
        refreshRef.current?.dispose();
        refreshRef.current = null;
        setLoading(false);
        setData(null);
        setConnected(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session || preview || !supabase) {
      setLoading(false);
      return;
    }
    const refresh = createRefresh(
      snapshot,
      (value) => {
        setData(value);
        setError("");
      },
      (error) =>
        setError(error instanceof Error ? error.message : "Không kết nối được"),
      setLoading,
    );
    refreshRef.current = refresh;
    void refresh.refresh();
    const channel = supabase
      .channel("lunch-updates")
      .on("postgres_changes", { event: "*", schema: "public" }, () =>
        refresh.invalidate(),
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") refresh.invalidate();
      });
    const interval = setInterval(() => refresh.invalidate(), 60000);
    const onFocus = () => refresh.invalidate();
    window.addEventListener("focus", onFocus);
    return () => {
      refresh.dispose();
      if (refreshRef.current === refresh) refreshRef.current = null;
      void supabase!.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [session, preview, reload]);
  async function mutate(
    kind: string,
    payload: Record<string, unknown>,
    version = 0,
  ) {
    if (preview) return null;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await command(kind, payload, version);
      await reload();
      setMessage("Đã lưu thay đổi. Nhật ký đã được ghi nhận.");
      return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu");
      throw e;
    } finally {
      setBusy(false);
    }
  }
  const shown = preview ? demo : data;
  const access = shown?.member.role !== "employee";
  const props = shown
    ? {
        data: shown,
        mutate: async (k: string, p: Record<string, unknown>, v?: number) => {
          try {
            return await mutate(k, p, v);
          } catch {
            return null;
          }
        },
        busy,
        readOnly: preview,
      }
    : null;
  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to="/order" className="brand">
          <span>
            <UtensilsCrossed size={24} />
          </span>
          <div>
            Cơm Của Nghĩa<small>BỮA TRƯA CÙNG NHAU</small>
          </div>
        </NavLink>
        <p className="nav-label">KHÔNG GIAN CỦA BẠN</p>
        <nav>
          {nav
            .filter(
              ([path]) => access || !["/menus", "/summary"].includes(path),
            )
            .map(([path, label, Icon]) => (
              <NavLink key={path} to={path}>
                <Icon size={19} />
                <span>{label}</span>
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-note">
          <Leaf size={24} />
          <h3>Ăn ngon, làm vui.</h3>
          <p>Một bữa trưa tử tế cho một ngày đầy năng lượng.</p>
        </div>
        <div className="profile">
          <span className="avatar">{shown?.member.display_name[0] ?? "N"}</span>
          <div>
            <b>{shown?.member.display_name ?? "Xin chào!"}</b>
            <small>
              {shown?.member.role === "admin"
                ? "Quản trị viên"
                : "Cơm trưa văn phòng"}
            </small>
          </div>
          {session && (
            <button
              className="icon-button"
              aria-label="Đăng xuất"
              onClick={() => void supabase?.auth.signOut()}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Không gian đặt cơm <span className="divider">/</span>{" "}
            <b>Rivercrane</b>
          </span>
          <div className="top-actions">
            <span className={"connection " + (connected ? "online" : "")}>
              {preview
                ? "Dữ liệu mẫu • chỉ xem"
                : connected
                  ? "Đang đồng bộ"
                  : "Chưa kết nối"}
            </span>
            {session && (
              <button
                className="icon-button"
                aria-label="Tải lại dữ liệu"
                onClick={() => void reload()}
              >
                <RefreshCw size={17} />
              </button>
            )}
          </div>
        </header>
        <main>
          {preview && (
            <div className="notice">
              Bản xem giao diện • Dữ liệu minh họa, không thể đặt cơm hoặc ghi
              dữ liệu.{" "}
              <button className="text-button" onClick={() => setPreview(false)}>
                Thoát xem thử
              </button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="success" role="status">
              {message}
            </div>
          )}
          {loading && !shown && <p role="status">Đang tải dữ liệu…</p>}
          {props ? (
            <Routes>
              <Route path="/order" element={<Orders {...props} />} />
              <Route
                path="/menus"
                element={
                  access ? <Menus {...props} /> : <Navigate to="/order" />
                }
              />
              <Route
                path="/summary"
                element={
                  access ? <Summary {...props} /> : <Navigate to="/order" />
                }
              />
              <Route path="/finance" element={<Finance {...props} />} />
              <Route path="/audit" element={<Audit {...props} />} />
              <Route
                path="/settings"
                element={
                  <Settings {...props} key={props.data.settings.version} />
                }
              />
              <Route path="*" element={<Navigate to="/order" />} />
            </Routes>
          ) : (
            <section className="welcome">
              <div className="welcome-mark">
                <UtensilsCrossed size={40} />
              </div>
              <p className="eyebrow">CƠM NGON. ĐỒNG ĐỘI VUI.</p>
              <h1>
                Bữa trưa của bạn,
                <br />
                gọn trong một nơi.
              </h1>
              <p>Đặt món, theo dõi công nợ và cập nhật cùng đồng nghiệp.</p>
              {!supabase ? (
                <div className="setup">
                  <h2>Kết nối hệ thống</h2>
                  <p>
                    Ứng dụng cần cấu hình Supabase và Google Login trước khi sử
                    dụng dữ liệu thật.
                  </p>
                  <small>
                    Quản trị viên: xem hướng dẫn triển khai trong repo.
                  </small>
                </div>
              ) : (
                <button
                  className="primary"
                  onClick={() =>
                    void supabase?.auth.signInWithOAuth({
                      provider: "google",
                      options: {
                        redirectTo: location.origin + "/order",
                        queryParams: { hd: "rivercrane.vn" },
                      },
                    })
                  }
                >
                  Đăng nhập với Google <ArrowUpRight size={18} />
                </button>
              )}
              <p className="fine">Dành cho tài khoản @rivercrane.vn</p>
              <button className="text-button" onClick={() => setPreview(true)}>
                Xem trước giao diện với dữ liệu mẫu →
              </button>
            </section>
          )}
        </main>
        <footer>
          Cơm Của Nghĩa <span>Đặt một bữa cơm. Thêm một niềm vui.</span>
        </footer>
      </div>
    </div>
  );
}
