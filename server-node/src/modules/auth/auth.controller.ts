import { Controller, Post, Body, Req, Res, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService, HttpFail } from './auth.service';

@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    const result = await this.auth.login(body, req.headers as Record<string, string | undefined>);
    return respond(res, result);
  }

  @Post('register')
  async register(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    const result = await this.auth.register(body, req.headers as Record<string, string | undefined>);
    return respond(res, result);
  }
}

/** 统一写出响应：HttpFail 带对应状态码；其余 200 */
function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}