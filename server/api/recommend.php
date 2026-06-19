<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    echo json_encode(['code' => 200, 'message' => 'OK']);
    exit;
}

session_start();
require_once '../config/Database.php';

class RecommendationSystem {
    private $conn;
    private $userId;
    private $cacheDir;
    
    public function __construct($database) {
        $this->conn = $database->getConnection();
        $this->userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 0;
        $this->cacheDir = '../cache/';
        // 创建缓存目录
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }
    
    // 获取推荐内容
    public function getRecommendations($limit = 20, $offset = 0) {
        try {
            // 检查缓存
            $cacheKey = 'recommendations_' . $this->userId . '_' . $limit . '_' . $offset;
            $cachedData = $this->getFromCache($cacheKey, 300); // 5分钟缓存
            if ($cachedData) {
                return $cachedData;
            }
            
            // 检查是否有运行中的A/B测试
            $abTest = $this->getActiveAbTest();
            $algorithm = 'hybrid'; // 默认算法
            
            // 如果有A/B测试，根据流量分配选择算法
            if ($abTest) {
                $algorithm = $this->allocateTraffic($abTest);
            } else {
                // 没有A/B测试时，使用配置的算法权重
                $algorithm = $this->getAlgorithmByWeight();
            }
            
            // 记录推荐请求（异步）
            $this->logRecommendationRequestAsync($algorithm, $abTest ? $abTest['id'] : null);
            
            // 根据选择的算法获取推荐内容
            $recommendations = $this->getRecommendationsByAlgorithm($algorithm, $limit, $offset);
            
            // 记录推荐展示（异步）
            $this->logRecommendationShowsAsync($recommendations, $algorithm, $abTest ? $abTest['id'] : null);
            
            $result = [
                'code' => 200,
                'message' => '获取推荐成功',
                'data' => [
                    'recommendations' => $recommendations,
                    'algorithm' => $algorithm,
                    'ab_test_id' => $abTest ? $abTest['id'] : null
                ]
            ];
            
            // 缓存结果
            $this->saveToCache($cacheKey, $result);
            
            return $result;
        } catch (Exception $e) {
            return [
                'code' => 500,
                'message' => '推荐系统错误: ' . $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ];
        }
    }
    
    // 获取活跃的A/B测试
    private function getActiveAbTest() {
        $cacheKey = 'active_ab_test';
        $cachedTest = $this->getFromCache($cacheKey, 60); // 1分钟缓存
        if ($cachedTest) {
            return $cachedTest;
        }
        
        $sql = "SELECT * FROM ab_tests WHERE status = 'running' ORDER BY start_time DESC LIMIT 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $test = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($test) {
            $this->saveToCache($cacheKey, $test);
        }
        
        return $test;
    }
    
    // 根据流量分配选择算法
    private function allocateTraffic($abTest) {
        $trafficSplit = $abTest['traffic_split'];
        $rand = rand(1, 100);
        $algorithm = $rand <= $trafficSplit ? $abTest['algorithm_a'] : $abTest['algorithm_b'];
        
        // 记录流量分配（异步）
        $this->logAbTestAllocationAsync($abTest['id'], $algorithm);
        
        return $algorithm;
    }
    
    // 根据权重选择算法
    private function getAlgorithmByWeight() {
        $cacheKey = 'algorithm_weights';
        $cachedWeights = $this->getFromCache($cacheKey, 3600); // 1小时缓存
        if ($cachedWeights) {
            return $this->selectAlgorithmByWeight($cachedWeights);
        }
        
        $sql = "SELECT algorithm, weight FROM recommendations WHERE enabled = 1";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute();
        $algorithms = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($algorithms)) {
            return 'hybrid';
        }
        
        $this->saveToCache($cacheKey, $algorithms);
        return $this->selectAlgorithmByWeight($algorithms);
    }
    
    // 根据权重选择算法
    private function selectAlgorithmByWeight($algorithms) {
        $totalWeight = array_sum(array_column($algorithms, 'weight'));
        $rand = mt_rand(1, $totalWeight * 1000) / 1000;
        $currentWeight = 0;
        
        foreach ($algorithms as $algo) {
            $currentWeight += $algo['weight'];
            if ($rand <= $currentWeight) {
                return $algo['algorithm'];
            }
        }
        
        return $algorithms[0]['algorithm'];
    }
    
    // 根据算法获取推荐内容
    private function getRecommendationsByAlgorithm($algorithm, $limit, $offset) {
        // 检查是否有用户画像可以使用
        if ($this->userId > 0) {
            try {
                // 尝试使用个性化推荐
                $personalizedRecommendations = $this->getPersonalizedRecommendations($limit, $offset);
                if (!empty($personalizedRecommendations)) {
                    return $personalizedRecommendations;
                }
            } catch (Exception $e) {
                // 个性化推荐失败，回退到通用推荐
                error_log('个性化推荐失败: ' . $e->getMessage());
            }
        }
        
        // 通用推荐逻辑
        // Set algorithm as MySQL variable to avoid repeated named parameter
        $this->conn->exec("SET @algo = " . $this->conn->quote($algorithm));
        
        $sql = "SELECT 
                    c.id, c.user_id, c.title, c.content, c.image_url, c.video_url, c.likes, c.comments, 
                    c.created_at, u.username, u.avatar 
                FROM content c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE c.status = 'published'
                ORDER BY 
                    CASE 
                        WHEN @algo = 'popularity' THEN c.likes + c.comments * 2
                        WHEN @algo = 'content_based' THEN c.created_at
                        WHEN @algo = 'collaborative_filtering' THEN c.likes
                        ELSE c.likes + c.comments * 2 + UNIX_TIMESTAMP(c.created_at) / 86400
                    END DESC
                LIMIT :limit OFFSET :offset";
        
        $stmt = $this->conn->prepare($sql);
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // 获取个性化推荐内容
    private function getPersonalizedRecommendations($limit, $offset) {
        // 构建用户画像
        $profile = $this->buildUserProfile();
        
        // 基于用户画像生成推荐
        return $this->generateRecommendationsFromProfile($profile, $limit, $offset);
    }
    
    // 构建用户画像
    private function buildUserProfile() {
        // 获取用户行为统计
        $behaviorStats = $this->getUserBehaviorStats();
        
        // 获取用户偏好标签
        $preferredTags = $this->getUserPreferredTags();
        
        // 获取用户偏好分类
        $preferredCategories = $this->getUserPreferredCategories();
        
        return [
            'user_id' => $this->userId,
            'behavior_stats' => $behaviorStats,
            'preferred_tags' => $preferredTags,
            'preferred_categories' => $preferredCategories
        ];
    }
    
    // 获取用户行为统计
    private function getUserBehaviorStats() {
        $sql = "SELECT 
                    type, 
                    COUNT(*) as count, 
                    AVG(duration) as avg_duration
                FROM user_behaviors 
                WHERE user_id = ? 
                GROUP BY type 
                ORDER BY count DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$this->userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // 获取用户偏好标签
    private function getUserPreferredTags() {
        // 首先获取用户交互过的内容ID
        $contentSql = "SELECT DISTINCT content_id FROM user_behaviors 
                      WHERE user_id = ? 
                          AND content_id IS NOT NULL 
                          AND content_id != ''";
        $contentStmt = $this->conn->prepare($contentSql);
        $contentStmt->execute([$this->userId]);
        $contentIds = $contentStmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (empty($contentIds)) {
            return [];
        }
        
        // 获取这些内容的标签
        $placeholders = str_repeat('?,', count($contentIds) - 1) . '?';
        $tagsSql = "SELECT tags FROM content WHERE id IN ($placeholders) AND tags IS NOT NULL AND tags != ''";
        $tagsStmt = $this->conn->prepare($tagsSql);
        $tagsStmt->execute($contentIds);
        $tagsResult = $tagsStmt->fetchAll(PDO::FETCH_COLUMN);
        
        // 统计标签频率
        $tagCounts = [];
        foreach ($tagsResult as $tagsStr) {
            $tags = explode(',', $tagsStr);
            foreach ($tags as $tag) {
                $tag = trim($tag);
                if (!empty($tag)) {
                    if (!isset($tagCounts[$tag])) {
                        $tagCounts[$tag] = 0;
                    }
                    $tagCounts[$tag]++;
                }
            }
        }
        
        // 按频率排序
        arsort($tagCounts);
        
        // 转换为数组格式
        $preferredTags = [];
        foreach ($tagCounts as $tag => $count) {
            $preferredTags[] = [
                'tag' => $tag,
                'count' => $count
            ];
        }
        
        return array_slice($preferredTags, 0, 10);
    }
    
    // 获取用户偏好分类
    private function getUserPreferredCategories() {
        $sql = "SELECT c.category, COUNT(*) as count
                FROM user_behaviors ub
                JOIN content c ON ub.content_id = c.id
                WHERE ub.user_id = ?
                GROUP BY c.category
                ORDER BY count DESC
                LIMIT 5";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$this->userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // 基于用户画像生成推荐
    private function generateRecommendationsFromProfile($profile, $limit, $offset) {
        // 构建查询条件
        $conditions = [];
        $params = [];
        
        // 基础条件
        $conditions[] = "c.status = 'published'";
        
        // 获取用户偏好标签
        $preferredTags = array_column($profile['preferred_tags'], 'tag');
        
        // 获取用户偏好分类
        $preferredCategories = array_column($profile['preferred_categories'], 'category');
        
        // 添加标签和分类偏好
        if (!empty($preferredTags) || !empty($preferredCategories)) {
            $preferenceConditions = [];
            
            // 标签偏好
            if (!empty($preferredTags)) {
                foreach ($preferredTags as $tag) {
                    $preferenceConditions[] = "c.tags LIKE ?";
                    $params[] = "%$tag%";
                }
            }
            
            // 分类偏好
            if (!empty($preferredCategories)) {
                $categoryPlaceholders = str_repeat('?,', count($preferredCategories) - 1) . '?';
                $preferenceConditions[] = "c.category IN ($categoryPlaceholders)";
                $params = array_merge($params, $preferredCategories);
            }
            
            if (!empty($preferenceConditions)) {
                $conditions[] = '(' . implode(' OR ', $preferenceConditions) . ')';
            }
        }
        
        // 构建SQL语句
        $sql = "SELECT 
                    c.id, c.user_id, c.title, c.content, c.image_url, c.video_url, c.likes, c.comments, 
                    c.created_at, u.username, u.avatar 
                FROM content c
                LEFT JOIN users u ON c.user_id = u.id
                WHERE " . implode(' AND ', $conditions) . "
                ORDER BY 
                    CASE 
                        WHEN c.tags LIKE ? THEN 1
                        ELSE 0
                    END DESC,
                    c.likes + c.comments * 2 DESC,
                    c.created_at DESC
                LIMIT ? OFFSET ?";
        
        // 添加排序参数
        $params[] = !empty($preferredTags) ? "%" . $preferredTags[0] . "%" : "";
        $params[] = $limit;
        $params[] = $offset;
        
        $stmt = $this->conn->prepare($sql);
        $stmt->execute($params);
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    // 异步记录推荐请求
    private function logRecommendationRequestAsync($algorithm, $abTestId = null) {
        // 使用快速日志记录
        $this->fastLog('recommendation_request', [
            'user_id' => $this->userId,
            'algorithm' => $algorithm,
            'ab_test_id' => $abTestId,
            'timestamp' => time()
        ]);
    }
    
    // 异步记录推荐展示
    private function logRecommendationShowsAsync($recommendations, $algorithm, $abTestId = null) {
        if (empty($recommendations)) return;
        
        // 批量插入
        $batchSize = 10;
        $batches = array_chunk($recommendations, $batchSize);
        
        foreach ($batches as $batch) {
            $this->batchLogRecommendationShows($batch, $algorithm, $abTestId);
        }
    }
    
    // 批量记录推荐展示
    private function batchLogRecommendationShows($recommendations, $algorithm, $abTestId = null) {
        try {
            // 批量插入到 user_behaviors
            $sql = "INSERT INTO user_behaviors (user_id, type, content_id, content_type, algorithm, recommend_id, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);
            
            $timestamp = time();
            $type = 'recommend_show';
            $contentType = 'content';
            
            foreach ($recommendations as $rec) {
                $recommendId = 'rec_' . uniqid();
                $stmt->execute([
                    $this->userId,
                    $type,
                    $rec['id'],
                    $contentType,
                    $algorithm,
                    $recommendId,
                    $timestamp
                ]);
            }
            
            // 记录到 recommendation_metrics
            $this->logMetrics('recommendation_show', $algorithm, count($recommendations));
            
            // 如果有A/B测试，记录到 ab_test_results
            if ($abTestId) {
                $this->logAbTestResult($abTestId, $algorithm, 'show', count($recommendations));
            }
        } catch (Exception $e) {
            // 记录错误但不影响主流程
            error_log('批量记录推荐展示失败: ' . $e->getMessage());
        }
    }
    
    // 异步记录A/B测试流量分配
    private function logAbTestAllocationAsync($abTestId, $algorithm) {
        // 使用快速日志记录
        $this->fastLog('ab_test_allocation', [
            'ab_test_id' => $abTestId,
            'algorithm' => $algorithm,
            'user_id' => $this->userId,
            'timestamp' => time()
        ]);
    }
    
    // 记录A/B测试结果
    private function logAbTestResult($abTestId, $algorithm, $type, $count = 1) {
        try {
            if ($type === 'show') {
                $sql = "INSERT INTO ab_test_results (test_id, algorithm, variant, shows) 
                        VALUES (:test_id, :algorithm, :variant, :count) 
                        ON DUPLICATE KEY UPDATE shows = shows + :count";
            } else if ($type === 'click') {
                $sql = "INSERT INTO ab_test_results (test_id, algorithm, variant, clicks) 
                        VALUES (:test_id, :algorithm, :variant, :count) 
                        ON DUPLICATE KEY UPDATE clicks = clicks + :count";
            }
            
            if (isset($sql)) {
                $stmt = $this->conn->prepare($sql);
                $stmt->bindParam(':test_id', $abTestId);
                        $stmt->bindValue(':variant', $algorithm === 'algorithm_a' ? 'A' : 'B');
                $stmt->bindParam(':count', $count, PDO::PARAM_INT);
                $stmt->execute();
            }
        } catch (Exception $e) {
            // 记录错误但不影响主流程
            error_log('记录A/B测试结果失败: ' . $e->getMessage());
        }
    }
    
    // 记录指标数据
    private function logMetrics($metricType, $metricName, $value) {
        try {
            $sql = "INSERT INTO recommendation_metrics (metric_type, metric_name, value, metadata) 
                    VALUES (:metric_type, :metric_name, :value, :metadata)";
            $stmt = $this->conn->prepare($sql);
            $stmt->bindParam(':metric_type', $metricType);
            $stmt->bindParam(':metric_name', $metricName);
            $stmt->bindParam(':value', $value, PDO::PARAM_INT);
            $stmt->bindValue(':metadata', json_encode(['user_id' => $this->userId, 'timestamp' => time()]));
            $stmt->execute();
        } catch (Exception $e) {
            // 记录错误但不影响主流程
            error_log('记录指标数据失败: ' . $e->getMessage());
        }
    }
    
    // 快速日志记录
    private function fastLog($type, $data) {
        // 写入日志文件
        $logFile = $this->cacheDir . 'recommendation_logs_' . date('Ymd') . '.log';
        $logData = json_encode([
            'type' => $type,
            'data' => $data,
            'timestamp' => time()
        ]) . "\n";
        file_put_contents($logFile, $logData, FILE_APPEND | LOCK_EX);
    }
    
    // 记录推荐点击
    public function logRecommendationClick($contentId, $algorithm, $abTestId = null, $recommendId = null) {
        try {
            // 记录到 user_behaviors
            $sql = "INSERT INTO user_behaviors (user_id, type, content_id, content_type, algorithm, recommend_id, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([
                $this->userId,
                'recommend_click',
                $contentId,
                'content',
                $algorithm,
                $recommendId,
                time()
            ]);
            
            // 记录到 recommendation_metrics
            $this->logMetrics('recommendation_click', $algorithm, 1);
            
            // 如果有A/B测试，记录到 ab_test_results
            if ($abTestId) {
                $this->logAbTestResult($abTestId, $algorithm, 'click', 1);
            }
            
            // 清除缓存
            $this->clearUserCache();
            
            return [
                'code' => 200,
                'message' => '记录点击成功'
            ];
        } catch (Exception $e) {
            return [
                'code' => 500,
                'message' => '记录点击失败: ' . $e->getMessage()
            ];
        }
    }
    
    // 缓存操作
    private function getFromCache($key, $expire = 3600) {
        $cacheFile = $this->cacheDir . md5($key) . '.cache';
        if (file_exists($cacheFile) && (time() - filemtime($cacheFile) < $expire)) {
            return json_decode(file_get_contents($cacheFile), true);
        }
        return false;
    }
    
    private function saveToCache($key, $data) {
        $cacheFile = $this->cacheDir . md5($key) . '.cache';
        file_put_contents($cacheFile, json_encode($data));
    }
    
    private function clearUserCache() {
        // 清除用户相关的缓存
        $files = glob($this->cacheDir . 'recommendations_' . $this->userId . '_*.cache');
        foreach ($files as $file) {
            unlink($file);
        }
    }
}

try {
    $database = new Database();
    $recommendationSystem = new RecommendationSystem($database);
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // 获取推荐
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
        $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
        $result = $recommendationSystem->getRecommendations($limit, $offset);
        echo json_encode($result);
    } elseif ($method === 'POST') {
        // 记录点击
        $data = json_decode(file_get_contents('php://input'), true);
        if (isset($data['action']) && $data['action'] === 'click') {
            $contentId = $data['content_id'];
            $algorithm = $data['algorithm'];
            $abTestId = $data['ab_test_id'] ?? null;
            $recommendId = $data['recommend_id'] ?? null;
            $result = $recommendationSystem->logRecommendationClick($contentId, $algorithm, $abTestId, $recommendId);
            echo json_encode($result);
        } else {
            echo json_encode([
                'code' => 400,
                'message' => '无效的操作'
            ]);
        }
    } else {
        echo json_encode([
            'code' => 405,
            'message' => '方法不允许'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'code' => 500,
        'message' => '服务器内部错误: ' . $e->getMessage()
    ]);
}
?>