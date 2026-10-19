
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
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

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

  // 初始化播放器，并诊断视频加载问题
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

    console.log("准备播放视频：", videoUrl);
    console.log("是否为 HLS 视频：", isHls);
    console.log("浏览器是否支持 HLS.js：", Hls.isSupported());
console.log(
  "浏览器原生 HLS 支持情况：",
  video.canPlayType("application/vnd.apple.mpegurl")
);
console.log("视频地址：", videoUrl);

    // 非 M3U8 视频，使用浏览器原生播放器
    if (!isHls) {
      video.src = videoUrl;
    } else if (Hls.isSupported()) {
      // Chrome、Edge 等浏览器使用 hls.js
      hls = new Hls({
        enableWorker: true,
      });

      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("视频元素绑定成功，开始加载 M3U8");
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("M3U8 播放列表解析成功");
        setPlaybackError("");
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error("HLS 错误详情：", {
          type: data.type,
          details: data.details,
          fatal: data.fatal,
          response: data.response,
        });

        if (!data.fatal || cancelled) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          setPlaybackError(
            "视频网络加载失败，请检查视频源、网络或跨域权限。"
          );
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          setPlaybackError(
            "视频解码失败，可能是视频编码或媒体分片异常。"
          );
        } else {
          setPlaybackError(
            "视频源无法播放，请检查 M3U8 地址和视频源。"
          );
        }
      });

      hls.loadSource(videoUrl);
      hls.attachMedia(video);
    } else if (
      video.canPlayType("application/vnd.apple.mpegurl")
    ) {
      // Safari 等支持原生 HLS 的浏览器
      video.src = videoUrl;
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
        setPlaybackError("");
      } else {
        video.pause();
      }
    } catch (error) {
      console.error("播放失败：", error);

      if (error instanceof Error) {
        console.error("错误名称：", error.name);
        console.error("错误信息：", error.message);
      }

      setPlaybackError(
        "暂时无法播放，请检查视频地址、网络或视频格式。"
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

  // 视频元素加载失败时输出详细信息
  function handleVideoError() {
    const video = videoRef.current;
    if (!video) return;

    console.error("视频元素加载失败：", {
      code: video.error?.code,
      message: video.error?.message,
      currentSrc: video.currentSrc,
      networkState: video.networkState,
      readyState: video.readyState,
    });

    setPlaybackError(
      "视频无法加载，请查看浏览器控制台中的具体错误。"
    );
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
        onError={handleVideoError}
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
        onChange={(event) => {
          handleSeek(Number(event.target.value));
        }}
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
            <span className="player-nav-disabled">
              ◀ 上一集
            </span>
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
            <span className="player-nav-disabled">
              下一集 ▶
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
