import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() u: { userId: string },
  ) {
    const article = await this.articles.create({ ...dto, authorId: u.userId });
    return { data: article };
  }

  @Get()
  async list(
    @Query('page') pageStr?: string,
    @Query('pageSize') pageSizeStr?: string,
    @Query('author') authorEmail?: string,
    @Query('q') q?: string,
  ) {
    const page = Math.max(1, Number(pageStr || 1));
    const pageSize = Math.min(50, Math.max(1, Number(pageSizeStr || 10)));
    const { items, total } = await this.articles.list({
      page,
      pageSize,
      authorEmail: authorEmail || undefined,
      q: q || undefined,
    });
    return { data: { items, page, pageSize, total } };
  }

  @Get(':slug')
  async get(@Param('slug') slug: string) {
    const article = await this.articles.get(slug);
    return { data: article };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':slug')
  async update(
    @Param('slug') slug: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() u: { userId: string },
  ) {
    const article = await this.articles.update(slug, u.userId, dto);
    return { data: article };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':slug')
  async remove(
    @Param('slug') slug: string,
    @CurrentUser() u: { userId: string },
  ) {
    const result = await this.articles.remove(slug, u.userId);
    return { data: result };
  }
}
