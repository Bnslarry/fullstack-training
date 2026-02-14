import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { ArticleViewDTO, ArticlesRepository } from './articles.repository';

type Tag = {
  tag: {
    name: string;
  };
};

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
  tags: Tag[];
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
      tagList: (a.tags ?? []).map((x: Tag) => x.tag.name),
    };
  }

  async create(input: {
    slug: string;
    title: string;
    description?: string;
    body: string;
    authorId: string;
    tagList: string[];
  }) {
    const { slug, title, description, body, authorId, tagList } = input;
    const article = await this.prisma.article.create({
      data: { slug, title, description, body, authorId },
    });

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const tagIds: string[] = [];

      for (const name of tagList) {
        const tag = await tx.tag.upsert({
          where: { name },
          update: {},
          create: { name },
          select: { id: true },
        });
        tagIds.push(tag.id);
      }

      if (tagIds.length) {
        await tx.articleTag.createMany({
          data: tagIds.map((tagId) => ({ articleId: article.id, tagId })),
          skipDuplicates: true,
        });
      }
    });

    const created = await this.findBySlug(article.slug);
    if (!created) {
      throw new Error('Article was created but could not be reloaded');
    }
    return created;
  }

  async findBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, email: true, nickname: true } },
        tags: {
          include: { tag: { select: { name: true } } },
        },
      },
    });
    return article ? this.toViewDTO(article) : null;
  }

  async updateBySlug(
    slug: string,
    input: {
      title?: string;
      description?: string;
      body?: string;
      tagList?: string[];
    },
  ) {
    const exists = await this.prisma.article.findUnique({ where: { slug } });
    if (!exists) {
      return null;
    }

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const { title, description, body } = input;
      const a = await tx.article.update({
        where: { slug },
        data: { title, description, body },
        select: { id: true, slug: true },
      });

      const { tagList } = input;
      const tagListProvided = Array.isArray(tagList);
      if (tagListProvided) {
        await tx.articleTag.deleteMany({ where: { articleId: a.id } });

        const tagIds: string[] = [];
        for (const name of tagList) {
          const tag = await tx.tag.upsert({
            where: { name },
            update: {},
            create: { name },
            select: { id: true },
          });
          tagIds.push(tag.id);
        }

        if (tagIds.length) {
          await tx.articleTag.createMany({
            data: tagIds.map((tagId) => ({ articleId: a.id, tagId })),
            skipDuplicates: true,
          });
        }
      }
    });
    return this.findBySlug(slug);
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
    tag?: string;
  }) {
    const { page, pageSize, authorEmail, q, tag } = input;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ArticleWhereInput = {};
    if (authorEmail) where.author = { email: authorEmail };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
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
          tags: {
            include: { tag: { select: { name: true } } },
          },
        },
      }),
    ]);

    return { total, items: items.map((x) => this.toViewDTO(x)) };
  }
}
