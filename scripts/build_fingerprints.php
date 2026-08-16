<?php
/**
 * build_fingerprints.php - 全量计算图片感知哈希指纹 + 相似分组
 *
 * 用法: php scripts/build_fingerprints.php [--threshold 8] [--rebuild]
 *   --rebuild    清空 image_fingerprints 全量重算
 *   --threshold  汉明距离阈值,默认 8
 *
 * 幂等:不传 --rebuild 时只增量处理(已有指纹的 source 跳过)
 */

require __DIR__ . '/../server/config/Database.php';
require __DIR__ . '/../server/services/ImageFingerprint.php';

$threshold = 8;
$rebuild = false;
foreach ($argv as $i => $a) {
    if ($a === '--rebuild') $rebuild = true;
    if ($a === '--threshold' && isset($argv[$i + 1])) $threshold = (int)$argv[$i + 1];
}

$db = (new Database())->getConnection();
$db->exec("CREATE TABLE IF NOT EXISTS image_fingerprints (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_table VARCHAR(20) NOT NULL DEFAULT 'content',
    source_id INT NOT NULL,
    phash CHAR(16) DEFAULT NULL,
    dhash CHAR(16) DEFAULT NULL,
    group_id INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_source (source_table, source_id),
    KEY idx_phash (phash),
    KEY idx_group (group_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

if ($rebuild) {
    $db->exec("DELETE FROM image_fingerprints");
    echo "[rebuild] 已清空指纹表\n";
}

// 站点根(把 URL 映射到本地路径)
$siteRoot = '/www/wwwroot/139.196.185.197_7070/doo';
$urlPrefix = 'http://139.196.185.197:7070/doo/';

/** URL -> 本地文件路径;外部 URL 下载到 /tmp;失败返回 null */
function resolveImage($url, $siteRoot, $urlPrefix)
{
    if (!$url) return null;
    $url = trim($url);
    if (strpos($url, $urlPrefix) === 0) {
        $local = $siteRoot . '/' . substr($url, strlen($urlPrefix));
        return is_file($local) ? $local : null;
    }
    // 外部 URL:下载到 /tmp
    $tmp = '/tmp/fp_' . md5($url) . '.img';
    if (!is_file($tmp)) {
        $ctx = stream_context_create(array('http' => array('timeout' => 8)));
        $data = @file_get_contents($url, false, $ctx);
        if ($data === false) return null;
        file_put_contents($tmp, $data);
    }
    return $tmp;
}

// ── 1. 收集所有图片来源 ──
$sources = array();
foreach ($db->query("SELECT id, image_url FROM content WHERE image_url <> '' AND status <> 'deleted'") as $r) {
    $sources[] = array('content', (int)$r['id'], $r['image_url']);
}
foreach ($db->query("SELECT id, url FROM images WHERE url <> ''") as $r) {
    $sources[] = array('images', (int)$r['id'], $r['url']);
}
echo "[1/3] 图片来源: " . count($sources) . " 条\n";

// ── 2. 计算指纹(增量跳过已有) ──
$stmt = $db->prepare("SELECT phash, dhash FROM image_fingerprints WHERE source_table = ? AND source_id = ?");
$ins = $db->prepare("INSERT INTO image_fingerprints (source_table, source_id, phash, dhash) VALUES (?,?,?,?)
                     ON DUPLICATE KEY UPDATE phash = VALUES(phash), dhash = VALUES(dhash)");
$ok = 0; $fail = 0; $skip = 0;
foreach ($sources as $s) {
    list($table, $id, $url) = $s;
    $stmt->execute(array($table, $id));
    if ($row = $stmt->fetch(PDO::FETCH_ASSOC)) { $skip++; continue; }
    $path = resolveImage($url, $siteRoot, $urlPrefix);
    if ($path === null) { $fail++; echo "  [skip] $table#$id 无法获取图片 ($url)\n"; continue; }
    $ph = ImageFingerprint::phash($path);
    $dh = ImageFingerprint::dhash($path);
    if ($ph === null || $dh === null) { $fail++; echo "  [skip] $table#$id 无法解码 ($url)\n"; continue; }
    $ins->execute(array($table, $id, $ph, $dh));
    $ok++;
    if ($ok % 20 === 0) echo "  ...已处理 $ok\n";
}
echo "[2/3] 新增指纹 $ok, 跳过(已有) $skip, 失败 $fail\n";

// ── 3. 相似分组(并查集) ──
$rows = array();
foreach ($db->query("SELECT id, source_table, source_id, phash, dhash FROM image_fingerprints") as $r) {
    $rows[] = $r;
}
$n = count($rows);
$parent = array_fill(0, $n, -1);
function find($p, $x) { while ($p[$x] !== -1 && $p[$x] !== $x) { $x = $p[$x]; } return $p[$x] === -1 ? $x : $p[$x]; }
function union(&$p, $a, $b) { $ra = find($p, $a); $rb = find($p, $b); if ($ra !== $rb) $p[$ra] = $rb; }

$pairs = 0;
for ($i = 0; $i < $n; $i++) {
    for ($j = $i + 1; $j < $n; $j++) {
        // phash 优先,距离 <= 阈值即同组;phash 缺失时用 dhash
        $d = ImageFingerprint::hamming($rows[$i]['phash'], $rows[$j]['phash']);
        if ($d === PHP_INT_MAX) $d = ImageFingerprint::hamming($rows[$i]['dhash'], $rows[$j]['dhash']);
        if ($d <= $threshold) { union($parent, $i, $j); $pairs++; }
    }
}

// 分配 group_id:同组取最小 source_id 所在行作代表,组号按代表升序从 1 开始
$groups = array();
for ($i = 0; $i < $n; $i++) {
    $root = find($parent, $i);
    $groups[$root][] = $i;
}
$gid = 0;
$upd = $db->prepare("UPDATE image_fingerprints SET group_id = ? WHERE id = ?");
foreach ($groups as $members) {
    if (count($members) < 2) continue; // 孤立图不分组
    $gid++;
    foreach ($members as $mi) $upd->execute(array($gid, $rows[$mi]['id']));
}

echo "[3/3] 相似组: $gid 组 (相似对 $pairs / 总图 $n)\n";
foreach ($groups as $members) {
    if (count($members) < 2) continue;
    $list = array();
    foreach ($members as $mi) $list[] = $rows[$mi]['source_table'] . '#' . $rows[$mi]['source_id'];
    echo "  组: " . implode(', ', $list) . "\n";
}

// ── 4. SIFT 复核(可选 --sift-verify):每组以锚点 SIFT 精匹配,不相似的拆组 ──
if (in_array('--sift-verify', $argv)) {
    echo "[4/4] SIFT 复核...\n";
    $siftPy = __DIR__ . '/../server/image_service/sift_match.py';
    $siteRoot4 = $siteRoot; // resolveImage 用
    $urlPrefix4 = $urlPrefix;
    $splitCount = 0;
    foreach ($groups as $members) {
        if (count($members) < 2) continue;
        // 锚 = 组内第一个(已按 source_id 升序)
        $anchor = $rows[$members[0]];
        $anchorPath = resolveImage(anchorUrl($anchor, $db), $siteRoot4, $urlPrefix4);
        if ($anchorPath === null) continue;
        foreach ($members as $mi) {
            if ($mi === $members[0]) continue;
            $m = $rows[$mi];
            $mPath = resolveImage(anchorUrl($m, $db), $siteRoot4, $urlPrefix4);
            if ($mPath === null) continue;
            $cmd = escapeshellcmd($siftPy) . ' ' . escapeshellarg($anchorPath) . ' ' . escapeshellarg($mPath) . ' 2>/dev/null';
            $out = shell_exec($cmd);
            $res = $out ? json_decode(trim($out), true) : null;
            $ok = $res && !empty($res['similar']);
            if (!$ok) {
                // 拆组:该成员移出(group_id=0)
                $db->prepare("UPDATE image_fingerprints SET group_id = 0 WHERE id = ?")->execute(array($m['id']));
                echo "  [拆分] " . $m['source_table'] . '#' . $m['source_id'] . " 与锚点 SIFT 不相似,移出组\n";
                $splitCount++;
            } else {
                echo "  [确认] " . $m['source_table'] . '#' . $m['source_id'] . " SIFT 确认同源(" . $res['inliers'] . " 内点)\n";
            }
        }
    }
    echo "SIFT 复核完成,拆出 $splitCount 条\n";
}
echo "完成\n";

/** 取 source 的图片 URL */
function anchorUrl($row, $db)
{
    if ($row['source_table'] === 'content') {
        $st = $db->prepare("SELECT image_url FROM content WHERE id = ?");
        $st->execute(array($row['source_id']));
        $r = $st->fetch(PDO::FETCH_ASSOC);
        return $r ? $r['image_url'] : '';
    }
    $st = $db->prepare("SELECT url FROM images WHERE id = ?");
    $st->execute(array($row['source_id']));
    $r = $st->fetch(PDO::FETCH_ASSOC);
    return $r ? $r['url'] : '';
}
