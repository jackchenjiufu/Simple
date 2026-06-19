<?php
/**
 * 更新用户资料API
 * 功能：
 * 1. 更新用户昵称
 * 2. 更新用户头像
 * 3. 更新用户背景图片
 */

// 设置CORS头
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 引入数据库连接
include_once __DIR__ . '/../config/Database.php';

// 初始化数据库连接
$database = new Database();
$db = $database->getConnection();

// 获取请求数据
$rawData = file_get_contents("php://input");
$data = json_decode($rawData);

// 检查用户ID是否存在
if (!empty($data->user_id)) {
    $setClauses = array(); // SQL更新语句的SET子句
    $params = array(); // SQL参数

    // 处理昵称更新
    if (!empty($data->nickname)) {
        $setClauses[] = "nickname = :nickname";
        $params[':nickname'] = $data->nickname;
    }

    // 处理头像更新
    if (!empty($data->avatar)) {
        $setClauses[] = "avatar = :avatar";
        $params[':avatar'] = $data->avatar;
    }

    // 处理背景图片更新
    if (!empty($data->background_image)) {
        $setClauses[] = "background_image = :background_image";
        $params[':background_image'] = $data->background_image;
    }

    // 处理性别更新
    if (!empty($data->gender)) {
        $setClauses[] = "gender = :gender";
        $params[':gender'] = $data->gender;
    }

    // 处理生日更新
    if (!empty($data->birthday)) {
        $setClauses[] = "birthday = :birthday";
        $params[':birthday'] = $data->birthday;
    }

    // 处理地区更新
    if (!empty($data->region)) {
        $setClauses[] = "region = :region";
        $params[':region'] = $data->region;
    }

    // 处理个人简介更新
    if (!empty($data->bio)) {
        $setClauses[] = "bio = :bio";
        $params[':bio'] = $data->bio;
    }

    // 处理邮箱更新
    if (!empty($data->email)) {
        if (!filter_var($data->email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(array("message" => "邮箱格式不正确", "code" => 400));
            exit;
        }
        $setClauses[] = "email = :email";
        $params[':email'] = $data->email;
    }

    // 如果有需要更新的数据
    if (count($setClauses) > 0) {
        // 构建SQL更新语句
        $query = "UPDATE users SET " . implode(", ", $setClauses) . " WHERE id = :user_id";
        $stmt = $db->prepare($query);
        $params[':user_id'] = $data->user_id;

        // 绑定参数
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        // 执行更新
        if ($stmt->execute()) {
            http_response_code(200);
            echo json_encode(array("message" => "更新成功", "code" => 200));
        } else {
            http_response_code(503);
            echo json_encode(array("message" => "更新失败", "code" => 503));
        }
    } else {
        // 没有需要更新的数据
        http_response_code(400);
        echo json_encode(array("message" => "没有需要更新的数据", "code" => 400));
    }
} else {
    // 用户ID不能为空
    http_response_code(400);
    echo json_encode(array("message" => "用户ID不能为空", "code" => 400));
}
