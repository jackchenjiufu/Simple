-- 创建文件表
CREATE TABLE IF NOT EXISTS `files` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `user_id` INT(11) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `size` BIGINT(20) NOT NULL,
  `type` VARCHAR(100) NOT NULL,
  `url` VARCHAR(500) NOT NULL,
  `oss_key` VARCHAR(500) NOT NULL,
  `folder` VARCHAR(255) DEFAULT NULL,
  `status` ENUM('uploading', 'success', 'failed') DEFAULT 'success',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
