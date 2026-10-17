import { Controller, Get, Post, Body, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { FeedbackService } from './feedback.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class FeedbackController {
  constructor(private readonly feedback: FeedbackService) {}

  @Get('feedback')
  async list(
    @Query('user_id') userId: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.max(1, Math.min(50, parseInt(limit || '20', 10) || 20));
    const r = await this.feedback.list(parseInt(userId || '0', 10) || 0, p, l);
    return respond(res, r);
  }

  @Post('feedback')
  async create(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    const r = await this.feedback.create(body, req.headers as Record<string, string | undefined>);
    return respond(res, r);
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}