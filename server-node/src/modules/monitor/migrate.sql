-- 监控模块并入 doo-app：所有表加 hub_ 前缀，避免与 DOO 现有表冲突
-- 幂等：先 TRUNCATE 再灌入，可重复执行

SET NAMES utf8mb4;

-- 服务清单
CREATE TABLE IF NOT EXISTS `doo-app`.hub_services LIKE simpleos.services;
TRUNCATE TABLE `doo-app`.hub_services;
INSERT INTO `doo-app`.hub_services SELECT * FROM simpleos.services;

-- 探活采样
CREATE TABLE IF NOT EXISTS `doo-app`.hub_health_samples LIKE simpleos.health_samples;
TRUNCATE TABLE `doo-app`.hub_health_samples;
INSERT INTO `doo-app`.hub_health_samples SELECT * FROM simpleos.health_samples;

-- 告警通道
CREATE TABLE IF NOT EXISTS `doo-app`.hub_alert_channels LIKE simpleos.alert_channels;
TRUNCATE TABLE `doo-app`.hub_alert_channels;
INSERT INTO `doo-app`.hub_alert_channels SELECT * FROM simpleos.alert_channels;

-- 告警事件
CREATE TABLE IF NOT EXISTS `doo-app`.hub_alert_events LIKE simpleos.alert_events;
TRUNCATE TABLE `doo-app`.hub_alert_events;
INSERT INTO `doo-app`.hub_alert_events SELECT * FROM simpleos.alert_events;

-- 告警图片路径改为 DOO uploads 下的对外路径
UPDATE `doo-app`.hub_alert_events
SET image_path = REPLACE(image_path, '/api/v1/uploads/', '/doo/server/uploads/hub/')
WHERE image_path LIKE '/api/v1/uploads/%';

-- 设备
CREATE TABLE IF NOT EXISTS `doo-app`.hub_devices LIKE simpleos.devices;
TRUNCATE TABLE `doo-app`.hub_devices;
INSERT INTO `doo-app`.hub_devices SELECT * FROM simpleos.devices;

-- 推送设置
CREATE TABLE IF NOT EXISTS `doo-app`.hub_user_settings LIKE simpleos.user_settings;
TRUNCATE TABLE `doo-app`.hub_user_settings;
INSERT INTO `doo-app`.hub_user_settings SELECT * FROM simpleos.user_settings;

-- hub 的 user_id(1=root) 映射到 DOO 账号 id=1
UPDATE `doo-app`.hub_devices SET user_id = 1;
UPDATE `doo-app`.hub_user_settings SET user_id = 1;
ALTER TABLE `doo-app`.hub_user_settings ADD UNIQUE KEY uk_user (user_id);

-- 校验
SELECT 'services' AS t, COUNT(*) AS n FROM `doo-app`.hub_services
UNION ALL SELECT 'health_samples', COUNT(*) FROM `doo-app`.hub_health_samples
UNION ALL SELECT 'alert_channels', COUNT(*) FROM `doo-app`.hub_alert_channels
UNION ALL SELECT 'alert_events', COUNT(*) FROM `doo-app`.hub_alert_events
UNION ALL SELECT 'devices', COUNT(*) FROM `doo-app`.hub_devices
UNION ALL SELECT 'user_settings', COUNT(*) FROM `doo-app`.hub_user_settings;
