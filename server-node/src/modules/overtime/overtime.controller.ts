import { Controller, Get, Post, Put, Delete, Body, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { OvertimeService } from './overtime.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class OvertimeController {
  constructor(private readonly overtime: OvertimeService) {}

  @Get('overtime')
  async get(@Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.overtime.handle('GET', query, {}, req.headers as Record<string, string | undefined>));
  }

  @Post('overtime')
  async post(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.overtime.handle('POST', {}, body, req.headers as Record<string, string | undefined>));
  }

  @Put('overtime')
  async put(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.overtime.handle('PUT', {}, body, req.headers as Record<string, string | undefined>));
  }

  @Delete('overtime')
  async delete(@Body() body: Record<string, unknown>, @Query() query: Record<string, string | undefined>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.overtime.handle('DELETE', query, body, req.headers as Record<string, string | undefined>));
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}