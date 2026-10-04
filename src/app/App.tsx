import OrderNavigationBoundary from "../features/OrderNavigationBoundary";
import { requestOrderNavigation } from "../features/useOrderDraft";
import { useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { UtensilsCrossed, ArrowUpRight } from "lucide-react";
import AppShell from "./AppShell";
import Button from "../components/ui/ActionButton";
import { Skeleton } from "../components/ui/skeleton";
import { supabase } from "../lib/supabase";
import { snapshot, command } from "../lib/api";
import { createRefresh } from "../lib/refresh";
import type { Snapshot, Order } from "../../shared/contracts";
import { demo } from "../lib/demo";
import Orders from "../features/Orders";
import Menus from "../features/Menus";
import Summary from "../features/Summary";
import Finance from "../features/Finance";
import Audit from "../features/Audit";
import Settings from "../features/Settings";
export default function App() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [preview, setPreview] = useState(false);
  const [session, setSession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
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
        connected,
        routeBlocking: true,
        commitOrder: async (
          r: import("../lib/order-autosave").OrderRequest,
        ) => {
          if (preview) throw new Error("Bản xem trước");
          const ack = (await command(
            r.kind,
            r.payload,
            r.version,
            r.requestId,
          )) as unknown as Order;
          refreshRef.current?.invalidate();
          return ack;
        },
        readOnly: preview,
      }
    : null;
  return (
    <AppShell
      member={shown?.member}
      session={session}
      preview={preview}
      connected={connected}
      onRefresh={() => void reload()}
      onLogout={() =>
        requestOrderNavigation(() => void supabase?.auth.signOut())
      }
    >
      <OrderNavigationBoundary />
      {preview && (
        <div className="notice">
          Bản xem giao diện • Dữ liệu minh họa, không thể đặt cơm hoặc ghi dữ
          liệu.{" "}
          <Button className="text-button" onClick={() => setPreview(false)}>
            Thoát xem thử
          </Button>
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
      {loading && !shown && (
        <div role="status" aria-label="Đang tải dữ liệu">
          <Skeleton className="h-10 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}
      {props ? (
        <Routes>
          <Route path="/order" element={<Orders {...props} />} />
          <Route
            path="/menus"
            element={access ? <Menus {...props} /> : <Navigate to="/order" />}
          />
          <Route path="/summary" element={<Summary {...props} />} />
          <Route path="/finance" element={<Finance {...props} />} />
          <Route path="/audit" element={<Audit {...props} />} />
          <Route
            path="/settings"
            element={<Settings {...props} key={props.data.settings.version} />}
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
                Ứng dụng cần cấu hình Supabase và Google Login trước khi sử dụng
                dữ liệu thật.
              </p>
              <small>Quản trị viên: xem hướng dẫn triển khai trong repo.</small>
            </div>
          ) : (
            <Button
              className="primary"
              disabled={loginBusy}
              onClick={() => {
                if (!supabase || loginBusy) return;
                setLoginBusy(true);
                setError("");
                void supabase.auth
                  .signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: location.origin + "/order",
                      queryParams: { hd: "rivercrane.vn" },
                    },
                  })
                  .then(({ error }) => {
                    if (error) setError(error.message);
                  })
                  .catch((error: unknown) => {
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Không mở được đăng nhập Google. Vui lòng thử lại.",
                    );
                  })
                  .finally(() => setLoginBusy(false));
              }}
            >
              {loginBusy ? "Đang mở Google…" : "Đăng nhập với Google"}{" "}
              <ArrowUpRight size={18} />
            </Button>
          )}
          <p className="fine">Dành cho tài khoản @rivercrane.vn</p>
          <Button
            className="text-button h-auto max-w-full whitespace-normal"
            onClick={() => setPreview(true)}
          >
            Xem trước giao diện với dữ liệu mẫu →
          </Button>
        </section>
      )}
    </AppShell>
  );
}
