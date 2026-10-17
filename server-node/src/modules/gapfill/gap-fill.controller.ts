import { Controller, Get, Post, Query, Body, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GapFillService } from './gap-fill.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class GapFillController {
  constructor(private readonly gap: GapFillService) {}

  @Post('add_collection')
  async addCollection(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return respond(res, await this.gap.addCollection(body));
  }

  @Get('get_collections')
  async getCollections(@Query('user_id') userId: string | undefined, @Res() res: Response) {
    return respond(res, await this.gap.getCollections(parseInt(userId || '0', 10) || 0));
  }

  @Get('article_authors')
  async articleAuthors(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.gap.articleAuthors(query, req.headers as Record<string, string | undefined>));
  }

  @Post('reset_password')
  async resetPassword(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return respond(res, await this.gap.resetPassword(body));
  }

  @Post('forgot_password')
  async forgotPassword(@Body() body: Record<string, unknown>, @Res() res: Response) {
    return respond(res, await this.gap.forgotPassword(body));
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}