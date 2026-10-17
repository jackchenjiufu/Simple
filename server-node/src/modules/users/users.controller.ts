import { Controller, Get, Post, Body, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { HttpFail } from '../auth/auth.service';

@Controller()
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('users')
  async list(@Req() req: Request, @Res() res: Response) {
    return respond(res, await this.users.list(req.headers as Record<string, string | undefined>));
  }

  @Post('change_password')
  async changePassword(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.users.changePassword(body, req.headers as Record<string, string | undefined>));
  }

  @Get('user_growth')
  async growth(@Query('user_id') userId: string | undefined, @Res() res: Response) {
    return respond(res, await this.users.growth(parseInt(userId || '0', 10) || 0));
  }

  @Post('delete_account')
  async deleteAccount(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.users.deleteAccount(body, req.headers as Record<string, string | undefined>));
  }

  @Post('update_user')
  async updateUser(@Body() body: Record<string, unknown>, @Req() req: Request, @Res() res: Response) {
    return respond(res, await this.users.updateUser(body, req.headers as Record<string, string | undefined>));
  }

  @Get('get_user_articles')
  async getUserArticles(
    @Query('user_id') userId: string | undefined,
    @Query('page') page: string | undefined,
    @Query('page_size') pageSize: string | undefined,
    @Res() res: Response,
  ) {
    const p = Math.max(1, parseInt(page || '1', 10) || 1);
    const ps = Math.max(1, parseInt(pageSize || '10', 10) || 10);
    return respond(res, await this.users.getUserArticles(parseInt(userId || '0', 10) || 0, p, ps));
  }
}

function respond(res: Response, result: unknown) {
  if (result instanceof HttpFail) {
    return res.status(result.httpStatus).json({ code: result.code, message: result.message });
  }
  return res.json(result);
}