<?php
require '/www/wwwroot/139.196.185.197_7070/doo/server/config/Database.php';
$db = (new Database())->getConnection();

echo "=== content 状态分布 ===\n";
foreach ($db->query("SELECT status, COUNT(*) c FROM content GROUP BY status") as $r) {
    echo $r['status'] . ' = ' . $r['c'] . "\n";
}
echo "=== content 时间分布(按天) ===\n";
foreach ($db->query("SELECT DATE(created_at) d, COUNT(*) c FROM content GROUP BY d ORDER BY d DESC LIMIT 10") as $r) {
    echo $r['d'] . ' = ' . $r['c'] . "\n";
}
echo "=== tags 填充率 ===\n";
foreach ($db->query("SELECT COUNT(*) total, SUM(tags <> '' AND tags IS NOT NULL) has_tags, SUM(recommended=1) rec FROM content") as $r) {
    echo 'total=' . $r['total'] . ' has_tags=' . $r['has_tags'] . ' recommended=' . $r['rec'] . "\n";
}
echo "=== category 分布 ===\n";
foreach ($db->query("SELECT category, COUNT(*) c FROM content GROUP BY category ORDER BY c DESC") as $r) {
    echo $r['category'] . ' = ' . $r['c'] . "\n";
}
echo "=== 最新10条 content ===\n";
foreach ($db->query("SELECT id, title, status, category, recommended, created_at FROM content ORDER BY id DESC LIMIT 10") as $r) {
    echo '#' . $r['id'] . ' [' . $r['status'] . ' rec=' . $r['recommended'] . '] ' . $r['category'] . ' | ' . mb_substr($r['title'], 0, 30) . ' | ' . $r['created_at'] . "\n";
}
echo "=== 爬虫发布脚本最近日志 ===\n";
foreach (glob('/var/log/doo_*.log') as $f) {
    $lines = count(file($f));
    echo basename($f) . ' = ' . $lines . " 行\n";
}
