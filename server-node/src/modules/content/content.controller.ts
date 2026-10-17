import { Controller, Get, Post, Put, Delete, Query, Body, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ContentService } from './content.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('site_info')
  async siteInfo(@Req() req: Request) {
    const host = (req.headers['host'] as string) || '';
    return this.content.siteInfo(host).catch(() =>
      this.content.error(500, '服务器内部错误')
    );
  }

  @Get('carousels')
  async carousels() {
    return this.content.carousels().catch(() => this.content.error(500, '获取失败'));
  }

  @Get('articles')
  async articles(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('category') category?: string,
  ) {
    const l = Math.max(0, parseInt(limit || '20', 10) || 20);
    const o = Math.max(0, parseInt(offset || '0', 10) || 0);
    const c = String(category ?? '');
    return this.content.articles(l, o, c).catch((e) =>
      this.content.error(400, String(e?.message || '获取失败')),
    );
  }

  @Get('content')
  async contentGet(
    @Query('id') id: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @Query('status') status: string | undefined,
    @Res() res: Response,
  ) {
    const idNum = parseInt(id || '0', 10) || 0;
    if (idNum > 0) return respond(res, await this.content.contentGet(idNum));
    const l = Math.max(1, parseInt(limit || '20', 10) || 20);
    const o = Math.max(0, parseInt(offset || '0', 10) || 0);
    const s = String(status || 'published');
    return respond(res, await this.content.contentList(l, o, s));
  }

  @Post('content')
  async contentCreate(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return respond(res, await this.content.contentCreate(body));
  }

  @Put('content')
  async contentUpdate(
    @Query('id') id: string | undefined,
    @Body() body: Record<string, unknown>,
    @Res() res: Response,
  ) {
    return respond(res, await this.content.contentUpdate(parseInt(id || '0', 10) || 0, body));
  }

  @Delete('content')
  async contentDelete(@Query('id') id: string | undefined, @Res() res: Response) {
    return respond(res, await this.content.contentDelete(parseInt(id || '0', 10) || 0));
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}