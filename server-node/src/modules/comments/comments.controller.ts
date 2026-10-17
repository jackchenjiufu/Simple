import { Controller, Get, Post, Delete, Body, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { CommentsService } from './comments.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('comments')
  async list(
    @Query('type') type: string | undefined,
    @Query('content_id') contentId: string | undefined,
    @Query('article_id') articleId: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const l = Math.max(1, Math.min(50, parseInt(limit || '20', 10) || 20));
    const r = await this.comments.list(
      type,
      parseInt(contentId || '0', 10) || 0,
      parseInt(articleId || '0', 10) || 0,
      p,
      l,
    );
    return respond(res, r);
  }

  @Post('comments')
  async create(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    const r = await this.comments.create(body, req.headers as Record<string, string | undefined>);
    return respond(res, r);
  }

  @Delete('comments')
  async remove(@Query('id') id: string | undefined, @Req() req: Request, @Res() res: Response) {
    const r = await this.comments.remove(parseInt(id || '0', 10) || 0, req.headers as Record<string, string | undefined>);
    return respond(res, r);
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}