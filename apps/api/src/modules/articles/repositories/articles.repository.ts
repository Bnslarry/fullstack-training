export const ARTICLES_REPOSITORY = Symbol('ARTICLES_REPOSITORY');

export interface ArticleDTO {
  slug: string;
  title: string;
  description?: string | null;
  body: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
}

export interface ArticlesRepository {
  create(input: {
    slug: string;
    title: string;
    description?: string;
    body: string;
    authorId: string;
  }): Promise<ArticleDTO>;
  findBySlug(slug: string): Promise<ArticleDTO | null>;
  updateBySlug(
    slug: string,
    input: { title?: string; description?: string; body?: string },
  ): Promise<ArticleDTO | null>;
  deleteBySlug(slug: string): Promise<boolean>;
  list(input: {
    page: number;
    pageSize: number;
  }): Promise<{ items: ArticleDTO[]; total: number }>;
}
