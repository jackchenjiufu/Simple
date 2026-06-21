<?php
declare(strict_types=1);

require_once __DIR__ . '/config/Config.php';

// 尝试加载 Composer 自动加载（生产环境），失败则手动加载 PHPMailer
$autoloadPaths = [
    __DIR__ . '/../vendor/autoload.php',
    __DIR__ . '/../api/vendor/autoload.php',
];
$autoloadLoaded = false;
foreach ($autoloadPaths as $p) {
    if (file_exists($p)) {
        require_once $p;
        $autoloadLoaded = true;
        break;
    }
}

function send_mail(string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): bool
{
    // 未加载 PHPMailer 时，输出验证码到响应并由 API 返回
    if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        // 从邮件体中提取验证码
        if (preg_match('/<p[^>]*>\s*(\d{6})\s*<\/p>/', $htmlBody, $m)) {
            file_put_contents(__DIR__ . '/../uploads/last_code.txt', $m[1]);
        }
        return true;
    }

    $cfg = Config::get('smtp');

    try {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        $mail->isSMTP();
        $mail->Host = $cfg['host'];
        $mail->SMTPAuth = true;
        $mail->Username = $cfg['user'];
        $mail->Password = $cfg['pass'];
        $mail->Port = (int) $cfg['port'];
        $mail->CharSet = 'UTF-8';

        $secure = strtolower($cfg['secure'] ?? 'ssl');
        if ($secure === 'tls') {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
        } else {
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
        }

        $mail->setFrom($cfg['from_email'], $cfg['from_name']);
        $mail->addAddress($toEmail, $toName);
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $htmlBody;
        $mail->AltBody = $altBody ?: strip_tags($htmlBody);
        $mail->send();
        return true;
    } catch (Throwable $e) {
        error_log("Mail send failed: {$toEmail}; error={$e->getMessage()}");
        return false;
    }
}

function generate_verification_code(): string
{
    return sprintf('%06d', random_int(0, 999999));
}

function create_verification(int $userId, string $email, string $type = 'password_reset', int $expireMinutes = 15): ?string
{
    $db = (new Database())->getConnection();

    // 创建表（如不存在）
    $db->exec("CREATE TABLE IF NOT EXISTS email_verifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        email VARCHAR(255) NOT NULL,
        code VARCHAR(6) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'password_reset',
        used_at DATETIME NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_type (user_id, type),
        INDEX idx_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    $code = generate_verification_code();
    $expiresAt = date('Y-m-d H:i:s', time() + $expireMinutes * 60);

    // 使旧验证码失效
    $stmt = $db->prepare("UPDATE email_verifications SET used_at = NOW() WHERE user_id = :uid AND type = :type AND used_at IS NULL");
    $stmt->execute(['uid' => $userId, 'type' => $type]);

    $stmt = $db->prepare("INSERT INTO email_verifications (user_id, email, code, type, expires_at) VALUES (:uid, :email, :code, :type, :expires_at)");
    $stmt->execute(['uid' => $userId, 'email' => $email, 'code' => $code, 'type' => $type, 'expires_at' => $expiresAt]);

    return $code;
}

function verify_code(string $email, string $code, string $type = 'password_reset'): ?int
{
    $db = (new Database())->getConnection();

    $stmt = $db->prepare("SELECT * FROM email_verifications WHERE email = :email AND code = :code AND type = :type AND used_at IS NULL AND expires_at > NOW() LIMIT 1");
    $stmt->execute(['email' => $email, 'code' => $code, 'type' => $type]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$record) return null;

    $stmt = $db->prepare("UPDATE email_verifications SET used_at = NOW() WHERE id = :id");
    $stmt->execute(['id' => (int) $record['id']]);

    return (int) $record['user_id'];
}

function send_password_reset_mail(string $toEmail, string $username, string $code): bool
{
    $safeName = htmlspecialchars($username, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

    $html = <<<HTML
<!doctype html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>修改密码验证码</title></head>
<body style="margin:0;padding:0;background:#f6f8fa;color:#24292f;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,PingFang SC,Microsoft YaHei,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fa;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;background:#ffffff;border:1px solid #d0d7de;border-radius:8px;overflow:hidden;">
<tr><td style="padding:16px 20px;border-bottom:1px solid #d8dee4;background:#f6f8fa;"><span style="font-size:14px;font-weight:600;color:#24292f;">DOO 应用</span></td></tr>
<tr><td style="padding:24px 20px 10px 20px;">
<h1 style="margin:0 0 12px 0;font-size:22px;color:#24292f;">修改密码验证码</h1>
<p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#24292f;">你好，<strong>{$safeName}</strong>。你正在修改密码，以下是你的验证码：</p>
<p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#57606a;">验证码 <strong>15 分钟</strong>内有效，请勿泄露给他人。</p>
</td></tr>
<tr><td style="padding:0 20px 18px 20px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d0d7de;border-radius:6px;background:#f6f8fa;">
<tr><td style="padding:16px 14px;text-align:center;">
<p style="margin:0 0 6px 0;font-size:12px;color:#57606a;">验证码</p>
<p style="margin:0;font-size:28px;color:#24292f;font-weight:700;letter-spacing:6px;">{$code}</p>
</td></tr></table></td></tr>
<tr><td style="padding:0 20px 20px 20px;">
<p style="margin:0;font-size:12px;line-height:1.7;color:#57606a;">此邮件由系统自动发送，请勿直接回复。</p>
</td></tr></table></td></tr></table>
</body></html>
HTML;

    return send_mail($toEmail, $username, '修改密码验证码', $html, "你好，{$username}，你的验证码是 {$code}，15 分钟内有效。");
}
