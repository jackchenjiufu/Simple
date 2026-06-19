<?php
/**
 * user_profile.php - 用户画像和行为分析接口
 * 
 * 功能：
 * - 构建用户画像
 * - 分析用户行为数据
 * - 提供个性化推荐的用户特征
 * - 支持内容相似度计算
 */

// 设置CORS头，允许跨域请求
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// 处理OPTIONS请求
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    echo json_encode(['code' => 200, 'message' => 'OK']);
    exit;
}

// 引入数据库连接类
session_start();
require_once '../config/Database.php';

class UserProfile {
    private $conn;
    private $userId;
    
    public function __construct($database) {
        $this->conn = $database->getConnection();
        $this->userId = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 0;
    }
    
    /**
     * 构建用户画像
     * @param int $userId 用户ID
     * @return array 用户画像数据
     */
    public function buildUserProfile($userId = null) {
        // 如果提供了用户ID，返回单个用户画像
        if ($userId) {
            return $this->buildSingleUserProfile($userId);
        }
        
        // 否则返回所有用户列表
        $userProfiles = $this->getAllUsersProfile();
        return [
            'code' => 200,
            'message' => '获取所有用户画像成功',
            'data' => $userProfiles
        ];
    }
    
    /**
     * 构建单个用户画像
     * @param int $userId 用户ID
     * @return array 用户画像数据
     */
    public function buildSingleUserProfile($userId) {
        try {
            // 获取用户基本信息
            $userInfo = $this->getUserBasicInfo($userId);
            
            // 获取用户行为统计
            $behaviorStats = $this->getUserBehaviorStats($userId);
            
            // 获取用户偏好内容
            $preferredContent = $this->getUserPreferredContent($userId);
            
            // 获取用户偏好标签
            $preferredTags = $this->getUserPreferredTags($userId);
            
            // 构建用户画像
            $profile = [
                'user_id' => $userId,
                'basic_info' => $userInfo,
                'behavior_stats' => $behaviorStats,
                'preferred_content' => $preferredContent,
                'preferred_tags' => $preferredTags,
                'created_at' => date('Y-m-d H:i:s')
            ];
            
            return [
                'code' => 200,
                'message' => '构建用户画像成功',
                'data' => $profile
            ];
        } catch (Exception $e) {
            return [
                'code' => 500,
                'message' => '构建用户画像失败: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 获取所有用户的画像列表
     * @return array 所有用户的画像数据
     */
    private function getAllUsersProfile() {
        try {
            // 获取所有用户的基本信息
            $sql = "SELECT id, username, nickname, avatar, created_at FROM users ORDER BY id DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 为每个用户构建简单的画像数据
            $userProfiles = [];
            foreach ($users as $user) {
                $userId = $user['id'];
                
                // 获取用户行为统计
                $behaviorStats = $this->getUserBehaviorStats($userId);
                
                // 获取用户偏好标签
                $preferredTags = $this->getUserPreferredTags($userId);
                
                $userProfiles[] = [
                    'user_id' => $userId,
                    'basic_info' => $user,
                    'behavior_stats' => $behaviorStats,
                    'preferred_tags' => $preferredTags,
                    'created_at' => date('Y-m-d H:i:s')
                ];
            }
            
            return $userProfiles;
        } catch (Exception $e) {
            throw $e;
        }
    }
    
    /**
     * 获取用户基本信息
     * @param int $userId 用户ID
     * @return array 用户基本信息
     */
    private function getUserBasicInfo($userId) {
        $sql = "SELECT id, username, nickname, avatar, created_at FROM users WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$user) {
            return [
                'id' => $userId,
                'username' => '未知用户',
                'nickname' => '未知用户',
                'avatar' => '',
                'created_at' => date('Y-m-d H:i:s')
            ];
        }
        
        return $user;
    }
    
    /**
     * 获取用户行为统计
     * @param int $userId 用户ID
     * @return array 行为统计数据
     */
    private function getUserBehaviorStats($userId) {
        // 过滤被动行为(page_view, recommend_show)，只统计主动行为和半主动行为
        $passiveTypes = ['page_view', 'recommend_show'];

        $sql = "SELECT
                    type,
                    COUNT(*) as count,
                    AVG(duration) as avg_duration
                FROM user_behaviors
                WHERE user_id = ?
                GROUP BY type
                ORDER BY count DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$userId]);
        $stats = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 过滤掉被动行为
        $activeStats = array_filter($stats, function($s) use ($passiveTypes) {
            return !in_array($s['type'], $passiveTypes);
        });
        $activeStats = array_values($activeStats); // 重置索引

        // 主动行为权重：content_click=5, recommend_click=4, page_stay=1
        $weights = [
            'content_click' => 5,
            'recommend_click' => 4,
            'page_stay' => 1
        ];

        $totalWeighted = 0;
        foreach ($activeStats as &$stat) {
            $stat['weight'] = $weights[$stat['type']] ?? 1;
            $stat['weighted_count'] = $stat['count'] * $stat['weight'];
            $totalWeighted += $stat['weighted_count'];
        }

        // 计算加权占比
        foreach ($activeStats as &$stat) {
            $stat['percentage'] = $totalWeighted > 0 ? round(($stat['weighted_count'] / $totalWeighted) * 100, 2) : 0;
        }

        // 总行为数也只用有效行为
        $totalBehaviors = array_sum(array_column($activeStats, 'count'));

        return [
            'total_behaviors' => $totalBehaviors,
            'behavior_types' => $activeStats
        ];
    }
    
    /**
     * 获取用户偏好内容
     * @param int $userId 用户ID
     * @return array 偏好内容数据
     */
    private function getUserPreferredContent($userId) {
        // 行为类型权重
        $weights = ['content_click' => 5, 'recommend_click' => 4, 'page_stay' => 1, 'page_view' => 0, 'recommend_show' => 0];

        $sql = "SELECT
                    content_id,
                    type,
                    COUNT(*) as interaction_count
                FROM user_behaviors
                WHERE user_id = ?
                    AND content_id IS NOT NULL
                    AND content_id != ''
                    AND content_id NOT LIKE 'rec_%'
                GROUP BY content_id, type
                ORDER BY interaction_count DESC";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 按 content_id 聚合，加权计算
        $aggregated = [];
        foreach ($rows as $row) {
            $cid = $row['content_id'];
            $weight = $weights[$row['type']] ?? 0;
            if ($weight <= 0) continue;
            if (!isset($aggregated[$cid])) {
                $aggregated[$cid] = ['content_id' => $cid, 'interaction_count' => 0, 'weighted_score' => 0];
            }
            $aggregated[$cid]['interaction_count'] += $row['interaction_count'];
            $aggregated[$cid]['weighted_score'] += $row['interaction_count'] * $weight;
        }

        // 按加权分数排序
        usort($aggregated, function($a, $b) {
            return $b['weighted_score'] - $a['weighted_score'];
        });
        $preferredContent = array_slice($aggregated, 0, 10);

        // 获取内容详情
        foreach ($preferredContent as &$item) {
            $contentSql = "SELECT id, title, image_url, tags, category FROM content WHERE id = ?";
            $contentStmt = $this->conn->prepare($contentSql);
            $contentStmt->execute([$item['content_id']]);
            $content = $contentStmt->fetch(PDO::FETCH_ASSOC);
            $item['content_info'] = $content ?: null;
        }
        
        return $preferredContent;
    }
    
    /**
     * 获取用户偏好标签
     * @param int $userId 用户ID
     * @return array 偏好标签数据
     */
    private function getUserPreferredTags($userId) {
        // 行为类型权重
        $weights = ['content_click' => 5, 'recommend_click' => 4, 'page_stay' => 1, 'page_view' => 0, 'recommend_show' => 0];

        // 获取用户交互过的内容ID及行为类型
        $sql = "SELECT content_id, type FROM user_behaviors
                WHERE user_id = ?
                    AND content_id IS NOT NULL
                    AND content_id != ''
                    AND content_id NOT LIKE 'rec_%'";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$userId]);
        $behaviors = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($behaviors)) {
            return [];
        }

        // 按 content_id 聚合权重
        $contentWeights = [];
        foreach ($behaviors as $b) {
            $cid = $b['content_id'];
            $w = $weights[$b['type']] ?? 0;
            if ($w <= 0) continue;
            if (!isset($contentWeights[$cid])) $contentWeights[$cid] = 0;
            $contentWeights[$cid] += $w;
        }

        if (empty($contentWeights)) {
            return [];
        }

        // 获取这些内容的标签，每条内容仅取一次标签
        $contentIds = array_keys($contentWeights);
        $placeholders = str_repeat('?,', count($contentIds) - 1) . '?';
        $tagsSql = "SELECT id, tags FROM content WHERE id IN ($placeholders) AND tags IS NOT NULL AND tags != ''";
        $tagsStmt = $this->conn->prepare($tagsSql);
        $tagsStmt->execute($contentIds);
        $taggedContent = $tagsStmt->fetchAll(PDO::FETCH_ASSOC);

        // 加权统计标签频率
        $tagCounts = [];
        foreach ($taggedContent as $row) {
            $cid = $row['id'];
            $weight = $contentWeights[$cid] ?? 1;
            $tags = explode(',', $row['tags']);
            foreach ($tags as $tag) {
                $tag = trim($tag);
                if (!empty($tag)) {
                    if (!isset($tagCounts[$tag])) $tagCounts[$tag] = 0;
                    $tagCounts[$tag] += $weight;
                }
            }
        }

        arsort($tagCounts);

        $preferredTags = [];
        foreach ($tagCounts as $tag => $score) {
            $preferredTags[] = ['tag' => $tag, 'score' => $score];
        }

        return array_slice($preferredTags, 0, 10);
    }
    
    /**
     * 计算内容相似度
     * @param int $contentId1 内容ID1
     * @param int $contentId2 内容ID2
     * @return array 相似度结果
     */
    public function calculateContentSimilarity($contentId1, $contentId2) {
        try {
            // 获取两个内容的信息
            $content1 = $this->getContentInfo($contentId1);
            $content2 = $this->getContentInfo($contentId2);
            
            if (!$content1 || !$content2) {
                throw new Exception('内容不存在');
            }
            
            // 计算标签相似度
            $tagSimilarity = $this->calculateTagSimilarity($content1['tags'], $content2['tags']);
            
            // 计算分类相似度
            $categorySimilarity = $content1['category'] === $content2['category'] ? 1 : 0;
            
            // 综合相似度
            $similarity = ($tagSimilarity * 0.7) + ($categorySimilarity * 0.3);
            
            return [
                'code' => 200,
                'message' => '计算内容相似度成功',
                'data' => [
                    'content_id1' => $contentId1,
                    'content_id2' => $contentId2,
                    'similarity' => round($similarity, 4),
                    'tag_similarity' => round($tagSimilarity, 4),
                    'category_similarity' => $categorySimilarity
                ]
            ];
        } catch (Exception $e) {
            return [
                'code' => 500,
                'message' => '计算内容相似度失败: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 获取内容信息
     * @param int $contentId 内容ID
     * @return array 内容信息
     */
    private function getContentInfo($contentId) {
        $sql = "SELECT id, title, tags, category FROM content WHERE id = ?";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$contentId]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * 计算标签相似度
     * @param string $tags1 标签字符串1
     * @param string $tags2 标签字符串2
     * @return float 相似度值
     */
    private function calculateTagSimilarity($tags1, $tags2) {
        if (empty($tags1) || empty($tags2)) {
            return 0;
        }
        
        $tagArray1 = array_filter(array_map('trim', explode(',', $tags1)));
        $tagArray2 = array_filter(array_map('trim', explode(',', $tags2)));
        
        if (empty($tagArray1) || empty($tagArray2)) {
            return 0;
        }
        
        // 计算交集和并集
        $intersection = array_intersect($tagArray1, $tagArray2);
        $union = array_unique(array_merge($tagArray1, $tagArray2));
        
        // 计算Jaccard相似度
        return count($intersection) / count($union);
    }
    
    /**
     * 获取基于用户画像的推荐内容
     * @param int $userId 用户ID
     * @param int $limit 推荐数量
     * @param int $offset 偏移量
     * @return array 推荐内容
     */
    public function getPersonalizedRecommendations($userId = null, $limit = 20, $offset = 0) {
        if (!$userId) {
            $userId = $this->userId;
        }
        
        try {
            // 构建用户画像
            $profileResult = $this->buildSingleUserProfile($userId);
            if ($profileResult['code'] !== 200) {
                throw new Exception('构建用户画像失败');
            }
            
            $profile = $profileResult['data'];
            
            // 获取用户偏好标签
            $preferredTags = array_column($profile['preferred_tags'], 'tag');
            
            // 获取用户偏好分类
            $preferredCategories = $this->getUserPreferredCategories($userId);
            
            // 构建个性化推荐查询
            $recommendations = $this->getRecommendationsBasedOnProfile($userId, $preferredTags, $preferredCategories, $limit, $offset);
            
            return [
                'code' => 200,
                'message' => '获取个性化推荐成功',
                'data' => [
                    'recommendations' => $recommendations,
                    'user_profile' => $profile
                ]
            ];
        } catch (Exception $e) {
            return [
                'code' => 500,
                'message' => '获取个性化推荐失败: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * 获取用户偏好分类
     * @param int $userId 用户ID
     * @return array 偏好分类数据
     */
    private function getUserPreferredCategories($userId) {
        $sql = "SELECT c.category, COUNT(*) as count
                FROM user_behaviors ub
                JOIN content c ON ub.content_id = c.id
                WHERE ub.user_id = ?
                GROUP BY c.category
                ORDER BY count DESC
                LIMIT 5";
        $stmt = $this->conn->prepare($sql);
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    /**
     * 获取内容相似度分析数据
     * @return array 内容相似度分析结果
     */
    
    public function getContentSimilarityAnalysis() {
        try {
            $sql = "SELECT c.id, c.user_id, c.title, c.content, c.image_url, c.video_url, c.likes, c.comments, c.created_at, c.tags, c.category FROM content c WHERE c.status = 'published' ORDER BY c.id DESC";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute();
            $contents = $stmt->fetchAll(PDO::FETCH_ASSOC);
            if (empty($contents)) {
                return ['code' => 200, 'message' => '暂无内容', 'data' => ['recommendations' => []]];
            }

            $userIds = array_unique(array_column($contents, 'user_id'));
            $userMap = [];
            if (!empty($userIds)) {
                $placeholders = implode(',', array_fill(0, count($userIds), '?'));
                $userSql = "SELECT id, username, nickname FROM users WHERE id IN ($placeholders)";
                $userStmt = $this->conn->prepare($userSql);
                $userStmt->execute(array_values($userIds));
                while ($user = $userStmt->fetch(PDO::FETCH_ASSOC)) {
                    $userMap[$user['id']] = $user;
                }
            }

            $contentFeatures = [];
            foreach ($contents as $content) {
                $tags = !empty($content['tags']) ? array_filter(array_map('trim', explode(',', $content['tags']))) : [];
                $titleWords = $this->extractWords($content['title'] ?? '');
                $contentWords = $this->extractWords($content['content'] ?? '');
                $contentFeatures[$content['id']] = ['tags' => $tags, 'title_words' => $titleWords, 'content_words' => $contentWords, 'category' => $content['category'] ?? '', 'data' => $content];
            }

            $similarityData = [];
            $processed = [];

            foreach ($contentFeatures as $id1 => $feat1) {
                $bestMatches = [];
                foreach ($contentFeatures as $id2 => $feat2) {
                    if ($id1 >= $id2) continue;
                    $pairKey = $id1 . '_' . $id2;
                    if (isset($processed[$pairKey])) continue;
                    $processed[$pairKey] = true;

                    $tagSim = $this->calcTagSim($feat1['tags'], $feat2['tags']);
                    $titleSim = $this->calcWordSim($feat1['title_words'], $feat2['title_words']);
                    $contentSim = $this->calcWordSim($feat1['content_words'], $feat2['content_words']);
                    $catSim = $this->calcCatSim($feat1['category'], $feat2['category']);
                    $similarity = ($tagSim * 0.35) + ($titleSim * 0.30) + ($contentSim * 0.20) + ($catSim * 0.15);

                    $bestMatches[] = ['id1' => $id1, 'id2' => $id2, 'similarity' => round($similarity, 4), 'tag_similarity' => round($tagSim, 4), 'title_similarity' => round($titleSim, 4), 'category_similarity' => round($catSim, 4)];
                }

                usort($bestMatches, function($a, $b) { return $b['similarity'] <=> $a['similarity']; });
                $topMatches = array_slice($bestMatches, 0, 3);

                $avgSim = !empty($topMatches) ? array_sum(array_column($topMatches, 'similarity')) / count($topMatches) : 0;
                $avgTag = !empty($topMatches) ? array_sum(array_column($topMatches, 'tag_similarity')) / count($topMatches) : 0;
                $avgCat = !empty($topMatches) ? array_sum(array_column($topMatches, 'category_similarity')) / count($topMatches) : 0;

                $content = $feat1['data'];
                $user = $userMap[$content['user_id']] ?? ['username' => '未知', 'nickname' => ''];
                $similarityData[] = [
                    'id' => $content['id'], 'user_id' => $content['user_id'], 'title' => $content['title'],
                    'content' => $content['content'], 'image_url' => $content['image_url'], 'video_url' => $content['video_url'],
                    'likes' => $content['likes'], 'comments' => $content['comments'], 'created_at' => $content['created_at'],
                    'username' => $user['username'] ?? '未知用户', 'nickname' => $user['nickname'] ?? '',
                    'similarity' => round($avgSim, 4), 'tag_similarity' => round($avgTag, 4), 'category_similarity' => round($avgCat, 4),
                    'top_matches' => $topMatches
                ];
            }

            usort($similarityData, function($a, $b) { return $b['similarity'] <=> $a['similarity']; });
            return ['code' => 200, 'message' => '获取内容相似度分析数据成功', 'data' => ['recommendations' => $similarityData]];
        } catch (Exception $e) {
            return ['code' => 500, 'message' => '获取内容相似度分析数据失败: ' . $e->getMessage()];
        }
    }

    private function extractWords($text) {
        if (empty($text)) return [];
        $text = strip_tags($text);
        preg_match_all('/[a-zA-Z]+|[0-9]+|[\x{4e00}-\x{9fa5}]/u', $text, $matches);
        $words = array_map('strtolower', $matches[0]);
        $skip = ['的','了','是','在','有','和','就','不','人','都','一','个','上','也','很','到','说','要','去','你','会','着','没','看','好','自','己','这','他','她','它','们'];
        $words = array_filter($words, function($w) use ($skip) {
            return mb_strlen($w) > 1 || !in_array($w, $skip);
        });
        return array_values($words);
    }

    private function calcTagSim($tags1, $tags2) {
        if (empty($tags1) || empty($tags2)) return 0;
        $intersection = array_intersect($tags1, $tags2);
        $union = array_unique(array_merge($tags1, $tags2));
        $jaccard = count($intersection) / count($union);
        $partial = 0;
        foreach ($tags1 as $t1) {
            foreach ($tags2 as $t2) {
                if ($t1 !== $t2 && (strpos($t1, $t2) !== false || strpos($t2, $t1) !== false)) $partial++;
            }
        }
        return min(1.0, $jaccard + ($partial > 0 ? min(0.3, $partial * 0.1) : 0));
    }

    private function calcWordSim($words1, $words2) {
        if (empty($words1) || empty($words2)) return 0;
        $set1 = array_unique($words1);
        $set2 = array_unique($words2);
        $intersection = array_intersect($set1, $set2);
        $union = array_unique(array_merge($set1, $set2));
        return count($intersection) / count($union);
    }

    private function calcCatSim($cat1, $cat2) {
        if (empty($cat1) || empty($cat2)) return 0;
        if ($cat1 === $cat2) return 1.0;
        if (strpos($cat1, $cat2) !== false || strpos($cat2, $cat1) !== false) return 0.6;
        return 0;
    }

    /**
     * 基于用户画像获取推荐内容
     * @param int $userId 用户ID
     * @param array $preferredTags 偏好标签
     * @param array $preferredCategories 偏好分类
     * @param int $limit 推荐数量
     * @param int $offset 偏移量
     * @return array 推荐内容
     */
    private function getRecommendationsBasedOnProfile($userId, $preferredTags, $preferredCategories, $limit, $offset) {
        // 构建查询条件
        $conditions = [];
        $params = [];
        
        // 基础条件
        $conditions[] = "c.status = 'published'";
        
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
                $categoryIds = array_column($preferredCategories, 'category');
                $categoryPlaceholders = str_repeat('?,', count($categoryIds) - 1) . '?';
                $preferenceConditions[] = "c.category IN ($categoryPlaceholders)";
                $params = array_merge($params, $categoryIds);
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
}

// 处理请求
try {
    $database = new Database();
    $userProfile = new UserProfile($database);
    
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // 获取用户ID
        $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
        $action = isset($_GET['action']) ? $_GET['action'] : 'profile';
        
        switch ($action) {
            case 'profile':
                // 构建用户画像
                // 确保正确获取user_id参数
                if (isset($_GET['user_id'])) {
                    $userId = (int)$_GET['user_id'];
                }
                $result = $userProfile->buildUserProfile($userId);
                break;
                
            case 'recommendations':
                // 获取个性化推荐
                $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
                $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
                $result = $userProfile->getPersonalizedRecommendations($userId, $limit, $offset);
                break;
                
            case 'similarity':
                // 计算内容相似度
                $contentId1 = isset($_GET['content_id1']) ? (int)$_GET['content_id1'] : null;
                $contentId2 = isset($_GET['content_id2']) ? (int)$_GET['content_id2'] : null;
                if (!$contentId1 || !$contentId2) {
                    $result = ['code' => 400, 'message' => '缺少内容ID参数'];
                } else {
                    $result = $userProfile->calculateContentSimilarity($contentId1, $contentId2);
                }
                break;
                
            case 'content_similarity':
                // 获取内容相似度分析数据
                $result = $userProfile->getContentSimilarityAnalysis();
                break;
                
            default:
                $result = ['code' => 400, 'message' => '无效的操作'];
        }
        
        echo json_encode($result);
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