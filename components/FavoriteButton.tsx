"use client";

// 收藏按钮:自己查"收藏了没",点击切换;未登录就送去登录页
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function FavoriteButton({ dramaId }: { dramaId: number }) {
  const [favorited, setFavorited] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // 打开详情页时:问一次接口,我收藏了这部吗
  useEffect(() => {
    fetch("/api/favorites")
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data: { items: { id: number }[] }) =>
        setFavorited(data.items.some((item) => item.id === dramaId))
      )
      .finally(() => setChecking(false));
  }, [dramaId]);

  async function toggle() {
    if (checking) return;
    const response = await fetch("/api/favorites", {
      method: favorited ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dramaId }),
    });

    // 接口说"请先登录" → 界面翻译成"送去登录页"
    if (response.status === 401) {
      router.push("/login");
      return;
    }
    if (response.ok) {
      setFavorited(!favorited);
    }
  }

  return (
    <button
      type="button"
      className={`favorite-button ${favorited ? "favorited" : ""}`}
      onClick={toggle}
      disabled={checking}
    >
      {checking ? "…" : favorited ? "★ 已收藏" : "☆ 收藏"}
    </button>
  );
}
