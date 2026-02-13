import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ARTICLES_REPOSITORY } from './repositories/articles.repository';
import { ArticlesPrismaRepository } from './repositories/articles.prisma.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [ArticlesController],
  providers: [
    ArticlesService,
    ArticlesPrismaRepository,
    {
      provide: ARTICLES_REPOSITORY,
      useClass: ArticlesPrismaRepository,
    },
  ],
})
export class ArticlesModule {}
