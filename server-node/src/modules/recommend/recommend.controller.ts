import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { RecommendService } from './recommend.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class RecommendController {
  constructor(private readonly recommend: RecommendService) {}

  @Get('recommend_images')
  async images(
    @Query('limit') limit: string | undefined,
    @Query('user_id') userId: string | undefined,
    @Query('scope') scope: string | undefined,
    @Res() res: Response,
  ) {
    const l = parseInt(limit || '0', 10) || 0;
    const uid = parseInt(userId || '0', 10) || 0;
    const sc = String(scope || 'all');
    const r = await this.recommend.images(l, uid, sc);
    if (r instanceof HttpFail) return res.status(r.httpStatus).json({ code: r.code, message: r.message });
    return res.json(r);
  }
}