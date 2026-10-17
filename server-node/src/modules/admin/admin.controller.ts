import { Controller, Post, Get, Put, Delete, Body, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AdminService } from './admin.service';
import { AdminContentService } from './admin-content.service';
import { AdminRecommendService } from './admin-recommend.service';
import { AdminCarouselsService } from './admin-carousels.service';
import { AdminFeedbackService, AdminReportsService, AdminCommentsService } from './admin-misc.service';
import { AdminSystemService } from './admin-system.service';
import { AdminSplashService } from './admin-splash.service';
import { AdminLogService } from './admin-log.service';
import { AdminBehaviorsService } from './admin-behaviors.service';
import { AdminPermissionsService } from './admin-permissions.service';
import { AdminApisService } from './admin-apis.service';
import { AdminAiService } from './admin-ai.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly adminContent: AdminContentService,
    private readonly adminRecommend: AdminRecommendService,
    private readonly adminCarousels: AdminCarouselsService,
    private readonly adminFeedback: AdminFeedbackService,
    private readonly adminReports: AdminReportsService,
    private readonly adminComments: AdminCommentsService,
    private readonly adminSystem: AdminSystemService,
    private readonly adminSplash: AdminSplashService,
    private readonly adminLog: AdminLogService,
    private readonly adminBehaviors: AdminBehaviorsService,
    private readonly adminPermissions: AdminPermissionsService,
    private readonly adminApis: AdminApisService,
    private readonly adminAi: AdminAiService,
  ) {}

  // ========== admin_login ==========
  @Post('admin_login')
  async login(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return respond(res, await this.admin.login(body));
  }

  // ========== admin_users ==========
  @Get('admin_users')
  async usersGet(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.admin.users('GET', query, {}, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_users')
  async usersPost(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.admin.users('POST', {}, body, req.headers as Record<string, string | undefined>));
  }
  @Put('admin_users')
  async usersPut(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.admin.users('PUT', {}, body, req.headers as Record<string, string | undefined>));
  }
  @Delete('admin_users')
  async usersDelete(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.admin.users('DELETE', query, {}, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_stats ==========
  @Get('admin_stats')
  async stats(@Query('type') type: string | undefined, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.admin.stats(String(type || 'overview'), req.headers as Record<string, string | undefined>, req.query as Record<string, string | undefined>));
  }

  // ========== admin_content ==========
  @Get('admin_content')
  async contentList(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminContent.list(query, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_content')
  async contentCreate(@Query('action') action: string | undefined, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminContent.create(String(action || ''), body, req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }
  @Put('admin_content')
  async contentUpdate(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminContent.update(body, req.headers as Record<string, string | undefined>));
  }
  @Delete('admin_content')
  async contentDelete(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminContent.remove(query, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_recommend ==========
  @Get('admin_recommend')
  async recommendGet(@Query('action') action: string | undefined, @Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminRecommend.handle(String(action || 'overview'), 'GET', {}, query, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_recommend')
  async recommendPost(@Query('action') action: string | undefined, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminRecommend.handle(String(action || 'overview'), 'POST', body, req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_carousels ==========
  @Get('admin_carousels')
  async carouselsList(@Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminCarousels.list(req.headers as Record<string, string | undefined>, req.query as Record<string, string | undefined>));
  }
  @Post('admin_carousels')
  async carouselsCreate(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminCarousels.create(body, req.headers as Record<string, string | undefined>));
  }
  @Put('admin_carousels')
  async carouselsUpdate(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminCarousels.update(body, req.headers as Record<string, string | undefined>));
  }
  @Delete('admin_carousels')
  async carouselsDelete(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminCarousels.remove(query, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_feedback ==========
  @Get('admin_feedback')
  async feedbackList(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminFeedback.list(query, req.headers as Record<string, string | undefined>));
  }
  @Put('admin_feedback')
  async feedbackUpdate(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminFeedback.update(body, req.headers as Record<string, string | undefined>));
  }
  @Delete('admin_feedback')
  async feedbackRemove(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminFeedback.remove(query, {}, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_reports ==========
  @Get('admin_reports')
  async reportsList(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminReports.list(query, req.headers as Record<string, string | undefined>));
  }
  @Put('admin_reports')
  async reportsUpdate(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminReports.update(body, req.headers as Record<string, string | undefined>));
  }
  @Delete('admin_reports')
  async reportsRemove(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminReports.remove(query, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_comments ==========
  @Get('admin_comments')
  async commentsList(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminComments.list(query, req.headers as Record<string, string | undefined>));
  }
  @Put('admin_comments')
  async commentsUpdate(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminComments.update(body, req.headers as Record<string, string | undefined>));
  }
  @Delete('admin_comments')
  async commentsRemove(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminComments.remove(query, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_database / admin_system_config / system_monitor ==========
  @Get('admin_database')
  async databaseGet(@Query('action') action: string | undefined, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminSystem.database(String(action || 'overview'), 'GET', {}, req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_database')
  async databasePost(@Query('action') action: string | undefined, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminSystem.database(String(action || 'query'), 'POST', body, req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }
  @Get('admin_system_config')
  async systemConfigGet(@Query('action') action: string | undefined, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminSystem.systemConfig(String(action || 'get_config'), 'GET', {}, req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_system_config')
  async systemConfigPost(@Query('action') action: string | undefined, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminSystem.systemConfig(String(action || 'save_config'), 'POST', body, req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }
  @Get('system_monitor')
  async systemMonitor(@Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminSystem.monitor('GET', req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }

  // ========== splash_config / migrate_feedback ==========
  @Get('splash_config')
  async splashGet(@Res() res: Response) {
    return respond(res, await this.adminSplash.getConfig());
  }
  @Post('splash_config')
  async splashPost(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminSplash.updateConfig(body, req.headers as Record<string, string | undefined>, req.query as Record<string, string | undefined>));
  }
  @Post('migrate_feedback')
  async migrateFeedback(@Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminSplash.migrateFeedback(req.headers as Record<string, string | undefined>, req.query as Record<string, string | undefined>));
  }

  // ========== admin_ai_logs ==========
  @Get('admin_ai_logs')
  async aiLogs(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminLog.aiLogs('GET', query, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_behaviors ==========
  @Get('admin_behaviors')
  async behaviorsGet(@Query('action') action: string | undefined, @Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminBehaviors.handle(String(action || 'list'), 'GET', {}, query, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_behaviors')
  async behaviorsPost(@Query('action') action: string | undefined, @Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminBehaviors.handle(String(action || ''), 'POST', body, req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }

  // ========== admin_permissions / admin_my_permissions ==========
  @Get('admin_permissions')
  async permissionsGet(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminPermissions.handle('GET', query, {}, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_permissions')
  async permissionsPost(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminPermissions.handle('POST', {}, body, req.headers as Record<string, string | undefined>));
  }
  @Put('admin_permissions')
  async permissionsPut(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminPermissions.handle('PUT', {}, body, req.headers as Record<string, string | undefined>));
  }
  @Delete('admin_permissions')
  async permissionsDelete(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminPermissions.handle('DELETE', query, {}, req.headers as Record<string, string | undefined>));
  }
  @Get('admin_my_permissions')
  async myPermissions(@Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminPermissions.myPermissions(req.headers as Record<string, string | undefined>, req.query as Record<string, string | undefined>));
  }

  // ========== admin_apis / admin_api_version / admin_v2api / admin_api_docs / ai_proxy ==========
  @Get('admin_apis')
  async apis(@Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminApis.apis(req.query as Record<string, string | undefined>, req.headers as Record<string, string | undefined>));
  }
  @Get('admin_api_version')
  async apiVersionGet(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminApis.apiVersion('GET', query, {}, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_api_version')
  async apiVersionPost(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminApis.apiVersion('POST', {}, body, req.headers as Record<string, string | undefined>));
  }
  @Get('admin_v2api')
  async v2apiGet(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminApis.v2api('GET', query, {}, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_v2api')
  async v2apiPost(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminApis.v2api('POST', {}, body, req.headers as Record<string, string | undefined>));
  }
  @Get('admin_api_docs')
  async apiDocsGet(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminApis.apiDocs('GET', query, {}, req.headers as Record<string, string | undefined>));
  }
  @Post('admin_api_docs')
  async apiDocsPost(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminApis.apiDocs('POST', {}, body, req.headers as Record<string, string | undefined>));
  }
  @Post('ai_proxy')
  async aiProxy(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.adminAi.handle(body, req.headers as Record<string, string | undefined>, req.query as Record<string, string | undefined>));
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}