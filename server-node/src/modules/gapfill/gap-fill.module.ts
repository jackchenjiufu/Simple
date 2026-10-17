import { Module } from '@nestjs/common';
import { GapFillController } from './gap-fill.controller';
import { GapFillService } from './gap-fill.service';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthService } from '../admin/admin-auth.service';

@Module({
  imports: [AuthModule],
  controllers: [GapFillController],
  providers: [GapFillService, AdminAuthService],
})
export class GapFillModule {}