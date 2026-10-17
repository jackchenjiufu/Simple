import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { MonitorGuard } from './monitor.guard';
import { MonitorService } from './monitor.service';
import { ok } from '../../common/response';

interface AuthedReq {
  user?: { id: number; username: string; role: string };
  deviceName?: string;
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
}

@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitor: MonitorService) {}

  // ---------- 总览 ----------

  @UseGuards(MonitorGuard)
  @Get('overview')
  async overview(@Req() req: AuthedReq) {
    await this.touch(req);
    return ok('获取成功', await this.monitor.overview());
  }

  // ---------- 服务探活 ----------

  @UseGuards(MonitorGuard)
  @Get('services')
  async services(@Req() req: AuthedReq) {
    await this.touch(req);
    return ok('获取成功', await this.monitor.serviceList());
  }

  @UseGuards(MonitorGuard)
  @Post('services/probe')
  async probe() {
    return ok('检测完成', await this.monitor.probeAll());
  }

  @UseGuards(MonitorGuard)
  @Get('services/:id/history')
  async history(@Param('id', ParseIntPipe) id: number, @Query('hours') hours = '24') {
    return ok('获取成功', await this.monitor.history(id, Number(hours) || 24));
  }

  // ---------- 告警 ----------

  /** 通道清单必须排在 /alerts/:id 之前，否则 channels 会被当成 id */
  @UseGuards(MonitorGuard)
  @Get('alerts/channels')
  async channels(@Req() req: AuthedReq) {
    await this.touch(req);
    return ok('获取成功', await this.monitor.channels());
  }

  @UseGuards(MonitorGuard)
  @Get('alerts/stats')
  async stats(@Query('days') days = '7') {
    return ok('获取成功', await this.monitor.stats(Number(days) || 7));
  }

  // ---------- 仪表板（数据取自 Grafana / Prometheus） ----------

  @UseGuards(MonitorGuard)
  @Get('dashboard')
  async dashboard() {
    return ok('获取成功', await this.monitor.dashboard());
  }

  /** 点服务器卡片：网口 + 监听端口 */
  @UseGuards(MonitorGuard)
  @Get('hosts/:host/detail')
  async hostDetail(@Param('host') host: string) {
    return ok('获取成功', await this.monitor.hostDetail(decodeURIComponent(host)));
  }

  /** 点服务器卡片：最近日志（src=all|err|app） */
  @UseGuards(MonitorGuard)
  @Get('hosts/:host/logs')
  async hostLogs(
    @Param('host') host: string,
    @Query('lines') lines = '120',
    @Query('src') src = 'all',
  ) {
    return ok(
      '获取成功',
      await this.monitor.hostLogs(decodeURIComponent(host), Number(lines) || 120, src),
    );
  }

  @UseGuards(MonitorGuard)
  @Get('alerts')
  async alerts(@Query('limit') limit = '50', @Query('since') since?: string) {
    return ok('获取成功', await this.monitor.alertList(Number(limit) || 50, since));
  }

  @UseGuards(MonitorGuard)
  @Get('alerts/:id')
  async alertDetail(@Param('id', ParseIntPipe) id: number) {
    return ok('获取成功', await this.monitor.alertDetail(id));
  }

  @UseGuards(MonitorGuard)
  @Post('alerts/:id/verdict')
  async verdict(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, unknown>) {
    const action = String(body?.action || '');
    return ok('已更新', await this.monitor.setVerdict(id, action));
  }

  /** 盒子/摄像头侧上报：不走用户 token，用固定的 ingest token */
  @Post('ingest')
  async ingest(
    @Body() body: Record<string, unknown>,
    @Headers('x-ingest-token') token?: string,
  ) {
    const expect = process.env.HUB_INGEST_TOKEN || '';
    if (!expect) throw new UnauthorizedException('上报未启用');
    if (!token || token !== expect) throw new UnauthorizedException('上报凭据无效');
    return ok('已接收', await this.monitor.ingest(body || {}));
  }

  // ---------- 设备 ----------

  @UseGuards(MonitorGuard)
  @Get('devices')
  async devices(@Req() req: AuthedReq) {
    await this.touch(req);
    return ok('获取成功', await this.monitor.devices());
  }

  // ---------- 推送设置 ----------

  @UseGuards(MonitorGuard)
  @Get('settings/push')
  async getPush(@Req() req: AuthedReq) {
    return ok('获取成功', await this.monitor.getPush(this.userId(req)));
  }

  @UseGuards(MonitorGuard)
  @Put('settings/push')
  async setPush(@Body() body: Record<string, unknown>, @Req() req: AuthedReq) {
    return ok('已保存', await this.monitor.setPush(this.userId(req), body || {}));
  }

  // ---------- 内部 ----------

  private userId(req: AuthedReq): number {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('未登录');
    return id;
  }

  /** 每次调用顺带更新设备心跳，我的页据此显示「本机」 */
  private async touch(req: AuthedReq): Promise<void> {
    const id = req.user?.id;
    if (!id) return;
    const ip =
      String(req.headers['x-real-ip'] || req.ip || '')
        .replace('::ffff:', '') || '';
    await this.monitor.touchDevice(id, req.deviceName || '', ip);
  }
}
