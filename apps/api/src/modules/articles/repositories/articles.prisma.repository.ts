import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { ArticleDTO, ArticlesRepository } from './articles.repository';

type ArticleRecord = {
  slug: string;
  title: string;
  description: string | null;
  body: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ArticlesPrismaRepository implements ArticlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDTO(a: ArticleRecord): ArticleDTO {
    return {
      slug: a.slug,
      title: a.title,
      description: a.description,
      body: a.body,
      authorId: a.authorId,
      createdAt: a.createdAt.getTime(),
      updatedAt: a.updatedAt.getTime(),
    };
  }

  async create(input: {
    slug: string;
    title: string;
    description?: string;
    body: string;
    authorId: string;
  }) {
    const article = await this.prisma.article.create({ data: input });
    return this.toDTO(article);
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    return article ? this.toDTO(article) : null;
  }

  async updateBySlug(
    slug: string,
    input: { title?: string; description?: string; body?: string },
  ) {
    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (!exists) {
      return null;
    }
    const article = await this.prisma.article.update({
      where: { slug },
      data: input,
    });
    return this.toDTO(article);
  }

  async deleteBySlug(slug: string) {
    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (!exists) {
      return false;
    }
    await this.prisma.article.delete({ where: { slug } });
    return true;
  }

  async list(input: { page: number; pageSize: number }) {
    const { page, pageSize } = input;
    const skip = (page - 1) * pageSize;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.article.count(),
      this.prisma.article.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return { total, items: items.map((x) => this.toDTO(x)) };
  }
}
