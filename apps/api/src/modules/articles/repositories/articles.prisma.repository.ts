import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { ArticleViewDTO, ArticlesRepository } from './articles.repository';

type ArticleRecord = {
  slug: string;
  title: string;
  description: string | null;
  body: string;
  author: {
    id: string;
    email: string;
    nickname: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ArticlesPrismaRepository implements ArticlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toViewDTO(a: ArticleRecord): ArticleViewDTO {
    return {
      slug: a.slug,
      title: a.title,
      description: a.description,
      body: a.body,
      createdAt: a.createdAt.getTime(),
      updatedAt: a.updatedAt.getTime(),
      author: {
        id: a.author.id,
        email: a.author.email,
        nickname: a.author.nickname,
      },
    };
  }

  async create(input: {
    slug: string;
    title: string;
    description?: string;
    body: string;
    authorId: string;
  }) {
    const article = await this.prisma.article.create({
      data: input,
      include: {
        author: { select: { id: true, email: true, nickname: true } },
      },
    });
    return this.toViewDTO(article);
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, email: true, nickname: true } },
      },
    });
    return article ? this.toViewDTO(article) : null;
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
      include: {
        author: { select: { id: true, email: true, nickname: true } },
      },
    });
    return this.toViewDTO(article);
  }

  async deleteBySlug(slug: string) {
    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (!exists) {
      return false;
    }
    await this.prisma.article.delete({ where: { slug } });
    return true;
  }

  async list(input: {
    page: number;
    pageSize: number;
    authorEmail?: string;
    q?: string;
  }) {
    const { page, pageSize, authorEmail, q } = input;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ArticleWhereInput = {};
    if (authorEmail) where.author = { email: authorEmail };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          author: { select: { id: true, email: true, nickname: true } },
        },
      }),
    ]);

    return { total, items: items.map((x) => this.toViewDTO(x)) };
  }
}
