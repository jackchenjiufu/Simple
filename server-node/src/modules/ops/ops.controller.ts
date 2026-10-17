import { Controller, Post, Get, Body, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { OpsService } from './ops.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class OpsController {
  constructor(private readonly ops: OpsService) {}

  @Post('announcements')
  async announcements(@Body() body: Record<string, unknown>, @Query('action') action: string | undefined, @Res() res: Response) {
    const a = body?.action ? String(body.action) : (action || '');
    return respond(res, await this.ops.announcements(a));
  }

  @Get('api_version')
  async apiVersion(@Res() res: Response) {
    return respond(res, await this.ops.apiVersion());
  }

  @Get('public_roles')
  async publicRoles(@Res() res: Response) {
    return respond(res, await this.ops.publicRoles());
  }

  @Post('check_update')
  async checkUpdatePost(@Body() body: Record<string, unknown>, @Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    const host = (req.headers['host'] as string) || '';
    return respond(res, await this.ops.checkUpdate(body, query, host));
  }

  @Get('check_update')
  async checkUpdateGet(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    const host = (req.headers['host'] as string) || '';
    return respond(res, await this.ops.checkUpdate({}, query, host));
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}