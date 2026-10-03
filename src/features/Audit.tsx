import { useState } from "react";
import type { PageProps } from "./common";
import { Empty } from "./common";
export default function Audit({ data, mutate, busy, readOnly }: PageProps) {
  const [filter, setFilter] = useState("");
  const memberName = (id: string | null) =>
    data.members.find((m) => m.id === id)?.display_name ??
    data.recipients?.find((m) => m.id === id)?.display_name;
  const events = data.events.filter((e) =>
    JSON.stringify(e).toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">MINH BẠCH MỖI THAY ĐỔI</p>
          <h1>Nhật ký hoạt động</h1>
          <p>Lưu người thực hiện, nội dung trước và sau, thời gian thay đổi.</p>
        </div>
        <input
          aria-label="Tìm nhật ký"
          placeholder="Tìm loại thao tác, nội dung…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <section className="panel">
        {!events.length ? (
          <Empty text="Nhật ký sẽ xuất hiện khi có thay đổi." />
        ) : (
          events.map((e) => (
            <article className="event" key={e.id}>
              <span className="event-dot" />
              <div>
                <b>{memberName(e.actor_id) ?? "Hệ thống"}</b>{" "}
                <span className="tag">{e.kind}</span>
                {e.subject_id && e.subject_id !== e.actor_id && (
                  <span className="tag">
                    Cho {memberName(e.subject_id) ?? "thành viên"}
                  </span>
                )}
                {e.after_cutoff && (
                  <span className="tag amber">Sau mốc dự kiến</span>
                )}
                <p className="muted">
                  {new Date(e.created_at).toLocaleString("vi-VN", {
                    timeZone: "Asia/Ho_Chi_Minh",
                  })}
                </p>
                <details>
                  <summary>Xem thay đổi</summary>
                  <div className="diff">
                    <div>
                      <small>TRƯỚC</small>
                      <pre>{JSON.stringify(e.before, null, 2) ?? "—"}</pre>
                    </div>
                    <div>
                      <small>SAU</small>
                      <pre>{JSON.stringify(e.after, null, 2) ?? "—"}</pre>
                    </div>
                  </div>
                </details>
              </div>
            </article>
          ))
        )}
      </section>
      <section className="panel">
        <h2>Trạng thái gửi Google Chat</h2>
        {data.deliveries.length ? (
          data.deliveries.map((d) => (
            <div className="order-row" key={d.id}>
              <span>{d.kind}</span>
              <span className="tag">
                {d.status} · {d.attempts} lần
              </span>
              <span>{d.last_error}</span>
              {d.status === "failed" && (
                <button
                  className="secondary"
                  disabled={busy || readOnly}
                  onClick={() => void mutate("delivery.retry", { id: d.id })}
                >
                  Thử gửi lại
                </button>
              )}
            </div>
          ))
        ) : (
          <p className="muted">
            Chưa có thông báo để hiển thị, hoặc bạn không có quyền xem.
          </p>
        )}
      </section>
    </>
  );
}
