import { Module } from '@nestjs/common';
import { ContentModule } from './modules/content/content.module';
import { AuthModule } from './modules/auth/auth.module';
import { CommentsModule } from './modules/comments/comments.module';
import { FeedbackModule } from './modules/feedback/feedback.module';
import { UsersModule } from './modules/users/users.module';
import { SocialModule } from './modules/social/social.module';
import { OpsModule } from './modules/ops/ops.module';
import { RecommendModule } from './modules/recommend/recommend.module';
import { AdminModule } from './modules/admin/admin.module';
import { OvertimeModule } from './modules/overtime/overtime.module';
import { GapFillModule } from './modules/gapfill/gap-fill.module';
import { MonitorModule } from './modules/monitor/monitor.module';

@Module({
  imports: [ContentModule, AuthModule, CommentsModule, FeedbackModule, UsersModule, SocialModule, OpsModule, RecommendModule, AdminModule, OvertimeModule, GapFillModule, MonitorModule],
})
export class AppModule {}