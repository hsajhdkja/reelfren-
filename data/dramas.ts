// ============================================
// ReelFren 全站共享数据层
// 首页、详情页、播放页都从这里读取数据。
// 阶段 4 接入数据库后,这个文件会被真实数据替换,
// 页面代码几乎不用改。
// ============================================

// 一集短剧
export type Episode = {
  number: number; // 第几集,从 1 开始
  title: string; // 这一集的标题
  videoUrl: string; // 视频播放地址
};

// 一部短剧
export type Drama = {
  id: number;
  title: string;
  category: string;
  episodes: number; // 总集数(列表里显示用)
  episodeList: Episode[]; // 具体的剧集列表(详情页、播放页用)
  rating: string;
  description: string;
  image: string;
  tag: string;
};

// 开发阶段的公共测试视频:Blender 基金会的开源短片,可免费合法使用。
// ⚠️ 正式上线前必须替换成我们自有版权或已获授权的内容,不能用这些占位视频。
const TEST_VIDEOS = [
  "https://media.w3.org/2010/05/sintel/trailer.mp4",
  "https://media.w3.org/2010/05/bunny/trailer.mp4",
  "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4",
];

// 批量生成一部剧的剧集列表:
// 第 index 集轮流使用上面 8 个测试视频之一(index % 8 就是轮流取),
// 这样每部剧几十集都有视频可播,而不用手写几百行数据。
function makeEpisodes(count: number): Episode[] {
  return Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    title: `第 ${index + 1} 集`,
    videoUrl: TEST_VIDEOS[index % TEST_VIDEOS.length],
  }));
}

export const dramas: Drama[] = [
  {
    id: 1,
    title: "The Last Promise",
    category: "Romance",
    episodes: 68,
    episodeList: makeEpisodes(68),
    rating: "9.2",
    description: "一场意外的重逢，让两个人重新面对过去的秘密与未完成的承诺。",
    image: "photo-1516589178581-6cd7833ae3b2",
    tag: "HOT",
  },
  {
    id: 2,
    title: "Queen of Revenge",
    category: "Revenge",
    episodes: 72,
    episodeList: makeEpisodes(72),
    rating: "9.5",
    description: "遭受背叛后，她决定重新开始，用自己的方式夺回失去的一切。",
    image: "photo-1534528741775-53994a69daeb",
    tag: "TRENDING",
  },
  {
    id: 3,
    title: "Love After Midnight",
    category: "Romance",
    episodes: 54,
    episodeList: makeEpisodes(54),
    rating: "8.9",
    description: "两个陌生人的偶然相遇，改变了一段看似早已注定的人生。",
    image: "photo-1517841905240-472988babdf9",
    tag: "NEW",
  },
  {
    id: 4,
    title: "The Hidden Heir",
    category: "Billionaire",
    episodes: 80,
    episodeList: makeEpisodes(80),
    rating: "9.1",
    description: "看似普通的年轻人，竟然隐藏着一个足以改变家族命运的身份。",
    image: "photo-1500648767791-00dcc994a43e",
    tag: "HOT",
  },
  {
    id: 5,
    title: "Betrayed Bride",
    category: "Revenge",
    episodes: 61,
    episodeList: makeEpisodes(61),
    rating: "8.8",
    description: "婚礼前夕的一次背叛，让她踏上了意想不到的反击之路。",
    image: "photo-1524504388940-b1c1722653e1",
    tag: "POPULAR",
  },
  {
    id: 6,
    title: "A Second Chance",
    category: "Drama",
    episodes: 49,
    episodeList: makeEpisodes(49),
    rating: "9.0",
    description: "人生重新开始之后，她终于有机会改变曾经的选择。",
    image: "photo-1508214751196-bcfd4ca60f91",
    tag: "NEW",
  },
  {
    id: 7,
    title: "Secret Billionaire",
    category: "Billionaire",
    episodes: 76,
    episodeList: makeEpisodes(76),
    rating: "9.3",
    description: "被所有人低估的他，逐渐揭开了自己真正的身份。",
    image: "photo-1506794778202-cad84cf45f1d",
    tag: "HOT",
  },
  {
    id: 8,
    title: "Falling for You",
    category: "Romance",
    episodes: 58,
    episodeList: makeEpisodes(58),
    rating: "8.7",
    description: "一次临时的合作，演变成一段谁也没有预料到的感情。",
    image: "photo-1529139574466-a303027c1d8b",
    tag: "POPULAR",
  },
];

export const categories = [
  { label: "全部", value: "All" },
  { label: "爱情", value: "Romance" },
  { label: "复仇", value: "Revenge" },
  { label: "豪门", value: "Billionaire" },
  { label: "剧情", value: "Drama" },
];

// 根据图片文件名拼出 Unsplash 的海报图地址
export function posterUrl(image: string) {
  return `https://images.unsplash.com/${image}?auto=format&fit=crop&w=700&h=1000&q=85`;
}

// 按 id 查找一部短剧;找不到就返回 null(第 2 课的详情页会用它处理不存在的编号)
export function getDramaById(id: number): Drama | null {
  return dramas.find((drama) => drama.id === id) ?? null;
}
