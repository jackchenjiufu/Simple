/**
 * 等级成长值计算（复刻 server/api/level_helper.php）
 *  成长值 = 发帖数×20 + 有效评论数×2 + 在线秒数÷600
 *  等级阈值: 20,60,120,200,320,500,750,1100,1600,2400
 */
export const LEVEL_THRESHOLDS = [20, 60, 120, 200, 320, 500, 750, 1100, 1600, 2400];

export function growthFromCounts(posts: number, validComments: number, onlineSeconds: number): number {
  return (posts | 0) * 20 + (validComments | 0) * 2 + Math.floor((onlineSeconds | 0) / 600);
}

export function levelFromGrowth(growth: number): number {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (growth >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}