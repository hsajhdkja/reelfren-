
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Hls from "hls.js";
import type { Episode } from "@/data/dramas";

type PlayerProps = {
  dramaId: number;
  episode: Episode;
  prevNumber: number | null;
  nextNumber: number | null;
  total: number;
};

// 将秒数转换为分:秒，例如 65.5 秒显示为 1:05
function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

export default function Player({
  dramaId,
  episode,
  prevNumber,
  nextNumber,
  total,
}: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState("");

  // 初始化播放器，并根据视频地址选择播放方式
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    let cancelled = false;

    setPlaybackError("");
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const videoUrl = episode.videoUrl;
    const isHls = /\.m3u8(?:$|[?#])/i.test(videoUrl);

    // 非 m3u8 地址：交给浏览器原生播放器处理
    if (!isHls) {
      video.src = videoUrl;

      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    // Safari 等浏览器可能原生支持 HLS
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;

      return () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
      };
    }

    // Chrome、Edge 等浏览器使用 hls.js 播放 HLS
    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
      });

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal || cancelled) return;

        console.error("HLS 播放错误：", data.type, data.details);
        setPlaybackError(
          "视频加载失败，请检查视频地址、网络或来源服务器权限。"
        );
      });
    } else {
      setPlaybackError("当前浏览器不支持此视频格式。");
    }

    return () => {
      cancelled = true;
      video.pause();
      hls?.destroy();
      video.removeAttribute("src");
      video.load();
    };
  }, [episode.videoUrl]);

  // 播放或暂停
  async function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (error) {
      console.error("播放失败：", error);
      setPlaybackError(
        "暂时无法播放，请检查视频地址是否有效，或稍后重试。"
      );
    }
  }

  // 拖动进度条跳转到指定时间
  function handleSeek(time: number) {
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;

    video.currentTime = time;
    setCurrentTime(time);
  }

  return (
    <div className="player">
      <video
        ref={videoRef}
        className="player-video"
        preload="metadata"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setPlaybackError(
            "视频无法加载，请检查播放地址是否有效。"
          );
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onLoadedMetadata={(event) => {
          const videoDuration = event.currentTarget.duration;

          setDuration(
            Number.isFinite(videoDuration) ? videoDuration : 0
          );
        }}
        onDurationChange={(event) => {
          const videoDuration = event.currentTarget.duration;

          setDuration(
            Number.isFinite(videoDuration) ? videoDuration : 0
          );
        }}
      />

      {playbackError && (
        <p role="alert" className="playback-error">
          {playbackError}
        </p>
      )}

      {/* 播放进度条 */}
      <input
        className="player-progress"
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => handleSeek(Number(event.target.value))}
        aria-label="播放进度"
        disabled={!duration}
      />

      {/* 播放控制区域 */}
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
          {prevNumber !== null ? (
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

          {nextNumber !== null ? (
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
