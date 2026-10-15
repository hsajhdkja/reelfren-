"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Episode } from "@/data/dramas";

// 从数据库来的集比旧类型多一个 id,扩展一下
type PlayerEpisode = Episode & { id: number };

type PlayerProps = {
  dramaId: number;
  episode: PlayerEpisode;
  prevNumber: number | null;
  nextNumber: number | null;
  total: number;
};

// 把 65.5 秒格式化成 "1:05"
function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Player({
  dramaId,
  episode,
  prevNumber,
  nextNumber,
  total,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [autoNext, setAutoNext] = useState(true); // 自动连播,默认开

  // 断点续看:保存进度(静默失败,不打扰看剧)
  function saveProgress() {
    const video = videoRef.current;
    if (!video || !video.duration || video.currentTime < 5) return;
    fetch("/api/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        episodeId: episode.id,
        positionSec: video.currentTime,
      }),
    }).catch(() => {});
  }

  // 播放中:每 10 秒自动存一次
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(saveProgress, 10000);
    return () => clearInterval(timer);
  }, [isPlaying, episode.id]);

  // 播完:开连播且有下一集 → 自动跳转
  function handleEnded() {
    saveProgress();
    if (autoNext && nextNumber) {
      router.push(`/dramas/${dramaId}/play/${nextNumber}`);
    }
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }

  function handleSeek(time: number) {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }

  // 视频元数据就绪:恢复上次的观看位置
  async function handleLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    setDuration(video.duration);
    try {
      const response = await fetch(`/api/progress?episodeId=${episode.id}`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.positionSec > 5 && data.positionSec < video.duration - 10) {
        video.currentTime = data.positionSec;
      }
    } catch {
      // 静默
    }
  }

  return (
    <div className="player">
      <video
        ref={videoRef}
        className="player-video"
        src={episode.videoUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => {
          setIsPlaying(false);
          saveProgress();
        }}
        onEnded={handleEnded}
        onTimeUpdate={(event) =>
          setCurrentTime(event.currentTarget.currentTime)
        }
        onLoadedMetadata={handleLoadedMetadata}
      />

      <input
        className="player-progress"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={(event) => handleSeek(Number(event.target.value))}
        aria-label="播放进度"
        disabled={!duration}
      />

      <div className="player-controls">
        <button
          type="button"
          className="player-play"
          onClick={togglePlay}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        <span className="player-time">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        <div className="player-nav">
          <label className="player-auto">
            <input
              type="checkbox"
              checked={autoNext}
              onChange={(e) => setAutoNext(e.target.checked)}
            />
            连播
          </label>

          {prevNumber ? (
            <Link
              className="secondary-button player-nav-button"
              href={`/dramas/${dramaId}/play/${prevNumber}`}
            >
              ◀ 上一集
            </Link>
          ) : (
            <span className="player-nav-disabled">◀ 上一集</span>
          )}

          <span className="player-episode-count">
            第 {episode.number} 集 / 共 {total} 集
          </span>

          {nextNumber ? (
            <Link
              className="secondary-button player-nav-button"
              href={`/dramas/${dramaId}/play/${nextNumber}`}
            >
              下一集 ▶
            </Link>
          ) : (
            <span className="player-nav-disabled">下一集 ▶</span>
          )}
        </div>
      </div>
    </div>
  );
}
