"use client";

// 后台管理页:门禁(仅 ADMIN)→ 剧目增删改查/上下架 + 剧集管理面板
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type AdminDrama = {
  id: number;
  title: string;
  category: string;
  rating: string;
  description: string;
  image: string;
  tag: string;
  published: boolean;
  episodes: number;
};

type EpisodeRow = {
  id: number;
  number: number;
  title: string;
  videoUrl: string;
};

type Me = { id: number; email: string; role: "USER" | "ADMIN" } | null;

const EMPTY_FORM = {
  title: "",
  category: "",
  rating: "",
  description: "",
  image: "",
  tag: "",
};

const EMPTY_EPISODE_FORM = { title: "", videoUrl: "" };

export default function AdminPage() {
  const [me, setMe] = useState<Me>(null);
  const [checked, setChecked] = useState(false);
  const [items, setItems] = useState<AdminDrama[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 剧集面板状态:当前展开哪部剧 + 每部剧的集列表缓存
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<Record<number, EpisodeRow[]>>({});
  const [epForm, setEpForm] = useState(EMPTY_EPISODE_FORM);
  const [epBusy, setEpBusy] = useState(false);

  // 门禁:进来先问"我是谁"
  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setMe(data))
      .finally(() => setChecked(true));
  }, []);

  const loadDramas = useCallback(() => {
    fetch("/api/admin/dramas")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) => setItems(data.items));
  }, []);

  useEffect(() => {
    if (me?.role === "ADMIN") loadDramas();
  }, [me, loadDramas]);

  // ---- 剧集面板 ----
  function loadEpisodes(dramaId: number) {
    fetch(`/api/admin/dramas/${dramaId}/episodes`)
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) =>
        setEpisodes((prev) => ({ ...prev, [dramaId]: data.items }))
      );
  }

  function toggleEpisodes(drama: AdminDrama) {
    if (expandedId === drama.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(drama.id);
    if (!episodes[drama.id]) loadEpisodes(drama.id);
  }

  async function handleAddEpisode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (expandedId === null) return;
    setEpBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/dramas/${expandedId}/episodes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(epForm),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message ?? "新增失败");
      }
      setMessage("剧集已添加(集数自动排列)");
      setEpForm(EMPTY_EPISODE_FORM);
      loadEpisodes(expandedId);
      loadDramas(); // 总集数变了,表格刷新
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "新增失败");
    } finally {
      setEpBusy(false);
    }
  }

  async function deleteEpisode(dramaId: number, ep: EpisodeRow) {
    if (!window.confirm(`确定删除第 ${ep.number} 集?`)) return;
    const response = await fetch(`/api/admin/episodes/${ep.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setMessage(`已删除第 ${ep.number} 集`);
      loadEpisodes(dramaId);
      loadDramas();
    }
  }

  // ---- 剧目表单 ----
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        editingId ? `/api/admin/dramas/${editingId}` : "/api/admin/dramas",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message ?? "操作失败");
      }
      setMessage(editingId ? `已保存剧 #${editingId}` : "新增成功");
      setForm(EMPTY_FORM);
      setEditingId(null);
      loadDramas();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(drama: AdminDrama) {
    setEditingId(drama.id);
    setForm({
      title: drama.title,
      category: drama.category,
      rating: drama.rating,
      description: drama.description,
      image: drama.image,
      tag: drama.tag,
    });
    setMessage(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function togglePublish(drama: AdminDrama) {
    const response = await fetch(`/api/admin/dramas/${drama.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !drama.published }),
    });
    if (response.ok) loadDramas();
  }

  async function remove(drama: AdminDrama) {
    const ok = window.confirm(
      `确定删除《${drama.title}》?\n它的 ${drama.episodes} 集以及所有收藏、观看进度都会一起删除,不可恢复!`
    );
    if (!ok) return;
    const response = await fetch(`/api/admin/dramas/${drama.id}`, {
      method: "DELETE",
    });
    if (response.ok) {
      setMessage(`已删除《${drama.title}》`);
      if (expandedId === drama.id) setExpandedId(null);
      loadDramas();
    }
  }

  // ---- 门禁三种状态 ----
  if (!checked) {
    return (
      <main className="admin-page">
        <p className="admin-loading">检查权限中…</p>
      </main>
    );
  }
  if (!me) {
    return (
      <main className="admin-page">
        <div className="auth-card">
          <h1>请先登录</h1>
          <p className="auth-switch">
            <Link href="/login">去登录</Link> · <Link href="/">回首页</Link>
          </p>
        </div>
      </main>
    );
  }
  if (me.role !== "ADMIN") {
    return (
      <main className="admin-page">
        <div className="auth-card">
          <h1>403 · 需要管理员权限</h1>
          <p className="auth-switch">
            当前账号:{me.email} · <Link href="/">回首页</Link>
          </p>
        </div>
      </main>
    );
  }

  // ---- 正式面板 ----
  return (
    <main className="admin-page">
      <header className="admin-top">
        <div>
          <span className="section-kicker">ADMIN CONSOLE</span>
          <h1>后台管理</h1>
        </div>
        <div className="admin-top-right">
          <span className="auth-email">{me.email}</span>
          <Link className="auth-link" href="/">
            回首页
          </Link>
        </div>
      </header>

      <form className="admin-form" onSubmit={handleSubmit}>
        <h2>{editingId ? `✏️ 编辑剧 #${editingId}` : "➕ 新增短剧"}</h2>
        <div className="admin-form-grid">
          <label className="auth-field">
            标题 *
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
          <label className="auth-field">
            分类 *
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Romance / Revenge / Billionaire / Drama"
              required
            />
          </label>
          <label className="auth-field">
            评分
            <input
              value={form.rating}
              onChange={(e) => setForm({ ...form, rating: e.target.value })}
              placeholder="9.0"
            />
          </label>
          <label className="auth-field">
            角标
            <input
              value={form.tag}
              onChange={(e) => setForm({ ...form, tag: e.target.value })}
              placeholder="NEW / HOT"
            />
          </label>
          <label className="auth-field admin-span2">
            海报地址 *
            <input
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="photo-xxxx(Unsplash 文件名)"
              required
            />
          </label>
          <label className="auth-field admin-span2">
            简介 *
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </label>
        </div>
        <div className="admin-form-actions">
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "处理中…" : editingId ? "保存修改" : "创建"}
          </button>
          {editingId && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
              }}
            >
              取消编辑
            </button>
          )}
        </div>
      </form>

      {message && <p className="admin-message">{message}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>分类</th>
            <th>评分</th>
            <th>集数</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {items.map((drama) => (
            <tr key={drama.id} className={drama.published ? "" : "row-off"}>
              <td>{drama.id}</td>
              <td>{drama.title}</td>
              <td>{drama.category}</td>
              <td>★ {drama.rating}</td>
              <td>{drama.episodes}</td>
              <td>
                <span
                  className={`admin-badge ${
                    drama.published ? "badge-on" : "badge-off"
                  }`}
                >
                  {drama.published ? "已上架" : "已下架"}
                </span>
              </td>
              <td className="admin-actions">
                <button
                  type="button"
                  className="admin-mini"
                  onClick={() => toggleEpisodes(drama)}
                >
                  剧集
                </button>
                <button
                  type="button"
                  className="admin-mini"
                  onClick={() => startEdit(drama)}
                >
                  编辑
                </button>
                <button
                  type="button"
                  className="admin-mini"
                  onClick={() => togglePublish(drama)}
                >
                  {drama.published ? "下架" : "上架"}
                </button>
                <button
                  type="button"
                  className="admin-mini admin-danger"
                  onClick={() => remove(drama)}
                >
                  删除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {expandedId !== null && (
        <section className="admin-episodes">
          <h2>
            🎬 剧集管理 ·{" "}
            {items.find((d) => d.id === expandedId)?.title ?? `#${expandedId}`}
          </h2>

          <div className="ep-list">
            {(episodes[expandedId] ?? []).map((ep) => (
              <div key={ep.id} className="ep-row">
                <span className="ep-number">第 {ep.number} 集</span>
                <span className="ep-title">{ep.title}</span>
                <span className="ep-url">{ep.videoUrl}</span>
                <button
                  type="button"
                  className="admin-mini admin-danger"
                  onClick={() => deleteEpisode(expandedId, ep)}
                >
                  删除
                </button>
              </div>
            ))}
            {(episodes[expandedId]?.length ?? 0) === 0 && (
              <p className="ep-empty">还没有剧集,用下面的表单添加第一集</p>
            )}
          </div>

          <form className="ep-form" onSubmit={handleAddEpisode}>
            <input
              placeholder="集标题(如:重逢)"
              value={epForm.title}
              onChange={(e) =>
                setEpForm({ ...epForm, title: e.target.value })
              }
              required
            />
            <input
              placeholder="视频地址 https://..."
              value={epForm.videoUrl}
              onChange={(e) =>
                setEpForm({ ...epForm, videoUrl: e.target.value })
              }
              required
            />
            <button className="primary-button" type="submit" disabled={epBusy}>
              {epBusy ? "添加中…" : "添加(集数自动排)"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
