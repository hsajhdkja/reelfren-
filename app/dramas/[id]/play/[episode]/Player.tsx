"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Episode } from "@/data/dramas";

type PlayerProps = {
  dramaId: number;
  episode: Episode;
  prevNumber: number | null;
  nextNumber: number | null;
  total: number;
};

// 把 65.5 秒格式化成 "1:05" 这种好读的样子
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
  const videoRef = useRef<HTMLVideoElement>(null); // 视频"遥控器"
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
    // 不用在这里手动改 isPlaying:下面的 onPlay/onPause 事件会自动同步
  }

  function handleSeek(time: number) {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time; // 让视频直接跳到这一秒
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
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration)
        }
      />

      {/* 进度条:拖动=跳转播放位置 */}
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
