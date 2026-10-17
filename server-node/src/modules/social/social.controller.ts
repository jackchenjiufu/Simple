import { Controller, Post, Body, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { SocialService } from './social.service';
import { MessagesService } from './messages.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class SocialController {
  constructor(
    private readonly social: SocialService,
    private readonly msgService: MessagesService,
  ) {}

  @Post('heartbeat')
  async heartbeat(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.social.heartbeat(body, req.headers as Record<string, string | undefined>));
  }

  @Post('report')
  async report(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return respond(res, await this.social.report(body));
  }

  @Post('user_behavior')
  async userBehavior(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, string | undefined>,
    @Res() res: Response,
  ) {
    return respond(res, await this.social.userBehavior(body, query));
  }

  @Post('messages')
  async messages(
    @Body() body: Record<string, unknown>,
    @Query() query: Record<string, string | undefined>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const action = body?.action ? String(body.action) : (query?.action || '');
    return respond(res, await this.msgService.handle(action, body, query, req.headers as Record<string, string | undefined>));
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}