import { Module } from '@nestjs/common';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';

/**
 * 监控模块：总览探活 / 告警 / 设备 / 推送设置
 * 从 simple-hub 并入，路由挂在 /api/v3/monitor/*，鉴权复用 DOO 的 auth_token。
 */
@Module({
  controllers: [MonitorController],
  providers: [MonitorService],
})
export class MonitorModule {}
