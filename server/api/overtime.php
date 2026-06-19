<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/../config/Database.php';

$database = new Database();
$db = $database->getConnection();

// 加班记录表
$db->exec("CREATE TABLE IF NOT EXISTS overtime (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    hours DECIMAL(5,2) NOT NULL DEFAULT 0,
    rate DECIMAL(8,2) NOT NULL DEFAULT 0,
    multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.5,
    salary DECIMAL(10,2) NOT NULL DEFAULT 0,
    note VARCHAR(255) DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// 费率配置表
$db->exec("CREATE TABLE IF NOT EXISTS overtime_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    normal_rate DECIMAL(3,1) DEFAULT 1.5,
    weekend_rate DECIMAL(3,1) DEFAULT 2.0,
    holiday_rate DECIMAL(3,1) DEFAULT 3.0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

// 薪资配置表
$db->exec("CREATE TABLE IF NOT EXISTS salary_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    base_salary DECIMAL(10,2) DEFAULT 0 COMMENT '底薪',
    bonus DECIMAL(10,2) DEFAULT 0 COMMENT '奖金',
    performance_score DECIMAL(5,2) DEFAULT 0 COMMENT '绩效分',
    performance_rate DECIMAL(3,1) DEFAULT 1.0 COMMENT '绩效系数',
    overtime_rate DECIMAL(8,2) DEFAULT 30 COMMENT '加班时薪',
    social_insurance TINYINT(1) DEFAULT 1 COMMENT '五险一金(1=缴纳,0=不缴纳)',
    si_pension DECIMAL(4,2) DEFAULT 8 COMMENT '养老个人比例%',
    si_medical DECIMAL(4,2) DEFAULT 2 COMMENT '医疗个人比例%',
    si_unemployment DECIMAL(4,2) DEFAULT 0.5 COMMENT '失业个人比例%',
    si_housing DECIMAL(4,2) DEFAULT 8 COMMENT '公积金个人比例%',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$userId = (int)($_GET['user_id'] ?? $_POST['user_id'] ?? 0);
$method = $_SERVER['REQUEST_METHOD'];

$input = json_decode(file_get_contents('php://input'), true);
if (!$userId && isset($input['user_id'])) $userId = (int)$input['user_id'];

// ====== 薪资配置 ======
if ($method === 'PUT' && isset($input['action']) && $input['action'] === 'save_salary') {
    $userId = (int)($input['user_id'] ?? 0);
    if (!$userId) { http_response_code(400); echo json_encode(['code'=>400,'message'=>'缺少用户ID']); exit; }

    $stmt = $db->prepare("INSERT INTO salary_config (user_id, base_salary, bonus, performance_score, performance_rate, overtime_rate, social_insurance, si_pension, si_medical, si_unemployment, si_housing)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE base_salary=VALUES(base_salary), bonus=VALUES(bonus), performance_score=VALUES(performance_score), performance_rate=VALUES(performance_rate), overtime_rate=VALUES(overtime_rate), social_insurance=VALUES(social_insurance), si_pension=VALUES(si_pension), si_medical=VALUES(si_medical), si_unemployment=VALUES(si_unemployment), si_housing=VALUES(si_housing)");
    $stmt->execute([
        $userId,
        $input['base_salary'] ?? 0,
        $input['bonus'] ?? 0,
        $input['performance_score'] ?? 0,
        $input['performance_rate'] ?? 1.0,
        $input['overtime_rate'] ?? 30,
        $input['social_insurance'] ?? 1,
        $input['si_pension'] ?? 8,
        $input['si_medical'] ?? 2,
        $input['si_unemployment'] ?? 0.5,
        $input['si_housing'] ?? 8
    ]);
    echo json_encode(['code'=>200,'message'=>'薪资配置保存成功']);
    exit;
}

// ====== 获取薪资配置 ======
$salaryConfig = null;
$stmt = $db->prepare("SELECT * FROM salary_config WHERE user_id = ?");
$stmt->execute([$userId]);
$salaryConfig = $stmt->fetch(PDO::FETCH_ASSOC);

// ====== GET ======
if ($method === 'GET') {
    $month = $_GET['month'] ?? date('Y-m');
    if (!$userId) { http_response_code(400); echo json_encode(['code'=>400,'message'=>'缺少用户ID']); exit; }

    // 获取该月记录
    $stmt = $db->prepare("SELECT id, date, hours, rate, multiplier, salary, note FROM overtime WHERE user_id = ? AND DATE_FORMAT(date, '%Y-%m') = ? ORDER BY date DESC");
    $stmt->execute([$userId, $month]);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalHours = 0; $totalSalary = 0; $totalDays = count($records);
    foreach ($records as $r) { $totalHours += (float)$r['hours']; $totalSalary += (float)$r['salary']; }

    // 计算总薪资
    $baseSalary = (float)($salaryConfig['base_salary'] ?? 0);
    $bonus = (float)($salaryConfig['bonus'] ?? 0);
    $perfScore = (float)($salaryConfig['performance_score'] ?? 0);
    $perfRate = (float)($salaryConfig['performance_rate'] ?? 1.0);
    $perfPay = $perfScore * $perfRate;
    // 五险一金计算（江苏标准）
    $socialDeduction = 0; $pensionDeduction = 0; $medicalDeduction = 0; $unemploymentDeduction = 0; $housingDeduction = 0;
    if ($salaryConfig && ($salaryConfig['social_insurance'] ?? 1) == 1) {
        $pensionRate = ($salaryConfig['si_pension'] ?? 8) / 100;
        $medicalRate = ($salaryConfig['si_medical'] ?? 2) / 100;
        $unempRate = ($salaryConfig['si_unemployment'] ?? 0.5) / 100;
        $housingRate = ($salaryConfig['si_housing'] ?? 8) / 100;
        $pensionDeduction = round($baseSalary * $pensionRate, 2);
        $medicalDeduction = round($baseSalary * $medicalRate, 2);
        $unemploymentDeduction = round($baseSalary * $unempRate, 2);
        $housingDeduction = round($baseSalary * $housingRate, 2);
        $socialDeduction = $pensionDeduction + $medicalDeduction + $unemploymentDeduction + $housingDeduction;
    }
    // 个人所得税计算（累计预扣法，简化月算）
    $taxableIncome = $baseSalary + $bonus + $perfPay + $totalSalary - $socialDeduction - 5000; // 起征点5000
    $tax = 0;
    if ($taxableIncome > 0) {
        if ($taxableIncome <= 3000) { $tax = $taxableIncome * 0.03; }
        elseif ($taxableIncome <= 12000) { $tax = $taxableIncome * 0.1 - 210; }
        elseif ($taxableIncome <= 25000) { $tax = $taxableIncome * 0.2 - 1410; }
        elseif ($taxableIncome <= 35000) { $tax = $taxableIncome * 0.25 - 2660; }
        elseif ($taxableIncome <= 55000) { $tax = $taxableIncome * 0.3 - 4410; }
        elseif ($taxableIncome <= 80000) { $tax = $taxableIncome * 0.35 - 7160; }
        else { $tax = $taxableIncome * 0.45 - 15160; }
        $tax = max(0, round($tax, 2));
    }
    $totalPay = $baseSalary + $bonus + $perfPay + $totalSalary - $socialDeduction - $tax;

    // 获取费率配置
    $stmt = $db->prepare("SELECT normal_rate, weekend_rate, holiday_rate FROM overtime_config WHERE user_id = ?");
    $stmt->execute([$userId]);
    $config = $stmt->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'code' => 200,
        'data' => [
            'records' => $records,
            'total_days' => $totalDays,
            'total_hours' => number_format($totalHours, 1),
            'total_overtime_salary' => number_format($totalSalary, 2),
            'salary_config' => $salaryConfig ? [
                'base_salary' => $baseSalary,
                'bonus' => $bonus,
                'performance_score' => $perfScore,
                'performance_rate' => $perfRate,
                'performance_pay' => round($perfPay, 2),
                'overtime_rate' => (float)($salaryConfig['overtime_rate'] ?? 30),
                'social_insurance' => (int)($salaryConfig['social_insurance'] ?? 1),
                'si_config' => ['pension' => (float)($salaryConfig['si_pension'] ?? 8), 'medical' => (float)($salaryConfig['si_medical'] ?? 2), 'unemployment' => (float)($salaryConfig['si_unemployment'] ?? 0.5), 'housing' => (float)($salaryConfig['si_housing'] ?? 8)],
                'social_deduction' => round($socialDeduction ?? 0, 2),
                'pension_deduction' => round($pensionDeduction ?? 0, 2),
                'medical_deduction' => round($medicalDeduction ?? 0, 2),
                'unemployment_deduction' => round($unemploymentDeduction ?? 0, 2),
                'housing_deduction' => round($housingDeduction ?? 0, 2),
                'taxable_income' => round(max(0, $taxableIncome), 2),
                'tax' => $tax,
                'total_pay' => round($totalPay, 2)
            ] : null,
            'rate_config' => $config ? [
                'normal' => (float)$config['normal_rate'],
                'weekend' => (float)$config['weekend_rate'],
                'holiday' => (float)$config['holiday_rate']
            ] : ['normal' => 1.5, 'weekend' => 2.0, 'holiday' => 3.0]
        ]
    ]);

// ====== POST ======
} elseif ($method === 'POST') {
    $date = $input['date'] ?? '';
    $hours = (float)($input['hours'] ?? 0);
    $rate = (float)($input['rate'] ?? 0);
    $multiplier = (float)($input['multiplier'] ?? 1.5);
    $note = $input['note'] ?? '';

    if (!$userId || !$date || $hours <= 0 || $rate <= 0) {
        http_response_code(400);
        echo json_encode(['code'=>400,'message'=>'参数不完整']);
        exit;
    }

    $salary = round($hours * $rate * $multiplier, 2);
    $stmt = $db->prepare("INSERT INTO overtime (user_id, date, hours, rate, multiplier, salary, note) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$userId, $date, $hours, $rate, $multiplier, $salary, $note]);

    echo json_encode(['code'=>200, 'message'=>'添加成功', 'data'=>['salary'=>$salary]]);

// ====== DELETE ======
} elseif ($method === 'DELETE') {
    $id = (int)($input['id'] ?? 0);
    $uid = (int)($input['user_id'] ?? 0);
    if (!$id || !$uid) { http_response_code(400); echo json_encode(['code'=>400,'message'=>'参数错误']); exit; }
    $stmt = $db->prepare("DELETE FROM overtime WHERE id = ? AND user_id = ?");
    $stmt->execute([$id, $uid]);
    echo json_encode(['code'=>200, 'message'=>'删除成功']);
}
