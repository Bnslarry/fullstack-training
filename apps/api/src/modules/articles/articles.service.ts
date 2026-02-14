import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  ARTICLES_REPOSITORY,
  type ArticlesRepository,
} from './repositories/articles.repository';

function slugify(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function normalizeTagList(tagList: string[]) {
  return Array.from(
    new Set(tagList.map((t) => t.trim().toLowerCase()).filter(Boolean)),
  );
}

@Injectable()
export class ArticlesService {
  constructor(
    @Inject(ARTICLES_REPOSITORY) private readonly repo: ArticlesRepository,
  ) {}

  async create(input: {
    title: string;
    description?: string;
    body: string;
    authorId: string;
    tagList?: string[];
  }) {
    const base = slugify(input.title);
    const try1 = base || 'article';
    const exists = await this.repo.findBySlug(try1);

    const slug = exists ? `${try1}-${Date.now().toString(36)}` : try1;

    const tagList = input.tagList ? normalizeTagList(input.tagList) : [];

    return this.repo.create({ ...input, slug, tagList });
  }

  async get(slug: string) {
    const article = await this.repo.findBySlug(slug);
    if (!article) {
      throw new NotFoundException('ARTICLE_NOT_FOUND');
    }
    return article;
  }

  async update(
    slug: string,
    authorId: string,
    patch: {
      title?: string;
      description?: string;
      body?: string;
      tagList?: string[];
    },
  ) {
    const article = await this.get(slug);
    if (article.author.id !== authorId) {
      throw new ForbiddenException('NOT_AUTHOR');
    }
    const normalizedPatch = Array.isArray(patch.tagList)
      ? { ...patch, tagList: normalizeTagList(patch.tagList) }
      : patch;
    const updated = await this.repo.updateBySlug(slug, normalizedPatch);
    if (!updated) throw new NotFoundException('ARTICLE_NOT_FOUND');
    return updated;
  }

  async remove(slug: string, authorId: string) {
    const article = await this.get(slug);
    if (article.author.id !== authorId) {
      throw new ForbiddenException('NOT_AUTHOR');
    }
    const ok = await this.repo.deleteBySlug(slug);
    if (!ok) throw new NotFoundException('ARTICLE_NOT_FOUND');
    return { ok: true };
  }

  async list(input: {
    page: number;
    pageSize: number;
    authorEmail?: string;
    q?: string;
    tag?: string;
  }) {
    return this.repo.list(input);
  }
}
