import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAuthService } from './admin-auth.service';
import { AdminContentService } from './admin-content.service';
import { AdminRecommendService } from './admin-recommend.service';
import { AdminCarouselsService } from './admin-carousels.service';
import { AdminFeedbackService, AdminReportsService, AdminCommentsService } from './admin-misc.service';
import { AdminSystemService } from './admin-system.service';
import { AdminSplashService } from './admin-splash.service';
import { AdminLogService } from './admin-log.service';
import { AdminBehaviorsService } from './admin-behaviors.service';
import { AdminPermissionsService } from './admin-permissions.service';
import { AdminApisService } from './admin-apis.service';
import { AdminAiService } from './admin-ai.service';

@Module({
  controllers: [AdminController],
  providers: [
    AdminService, AdminAuthService, AdminContentService, AdminRecommendService, AdminCarouselsService,
    AdminFeedbackService, AdminReportsService, AdminCommentsService, AdminSystemService,
    AdminSplashService, AdminLogService, AdminBehaviorsService, AdminPermissionsService,
    AdminApisService, AdminAiService,
  ],
})
export class AdminModule {}