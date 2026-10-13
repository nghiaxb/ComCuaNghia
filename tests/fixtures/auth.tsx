import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
} from "@supabase/supabase-js";
import App from "../../src/app/App";
import { demo } from "../../src/lib/demo";
import "../../src/app/styles.css";
const params = new URLSearchParams(location.search);
const session = {
  access_token: "fixture-token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "fixture-refresh",
  user: { id: "fixture-user" },
} as Session;
let listener:
  | ((event: AuthChangeEvent, session: Session | null) => void)
  | undefined;
const channel = { on: () => channel, subscribe: () => channel };
let sessionAttempts = 0;
// Only the methods exercised by App are simulated; this never authenticates a real account.
const client = {
  auth: {
    getSession: () => {
      const attempt = ++sessionAttempts;
      return new Promise((resolve, reject) =>
        setTimeout(
          () =>
            params.has("error") && attempt === 1
              ? reject(new Error("Phiên chưa tải được"))
              : resolve({
                  data: { session: params.has("empty") ? null : session },
                  error: null,
                }),
          1000,
        ),
      );
    },
    onAuthStateChange: (callback: typeof listener) => {
      listener = callback;
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              listener = undefined;
            },
          },
        },
      };
    },
    signOut: async () => {
      listener?.("SIGNED_OUT", null);
      return { error: null };
    },
  },
  channel: () => channel,
  removeChannel: async () => "ok",
} as unknown as SupabaseClient;
const fetchSnapshot = () =>
  new Promise<typeof demo>((resolve) =>
    setTimeout(() => resolve(structuredClone(demo)), 800),
  );
const router = createBrowserRouter([
  {
    path: "*",
    element: (
      <>
        <button
          className="fixed bottom-2 right-2 z-50 min-h-11 bg-background p-2"
          onClick={() => listener?.("SIGNED_OUT", null)}
        >
          Phiên đã đăng xuất
        </button>
        <App client={client} fetchSnapshot={fetchSnapshot} />
      </>
    ),
  },
]);
createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
