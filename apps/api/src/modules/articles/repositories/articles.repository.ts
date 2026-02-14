export const ARTICLES_REPOSITORY = Symbol('ARTICLES_REPOSITORY');

export interface AuthorDTO {
  id: string;
  email: string;
  nickname: string;
}

export interface ArticleViewDTO {
  slug: string;
  title: string;
  description?: string | null;
  body: string;
  createdAt: number;
  updatedAt: number;
  author: AuthorDTO;
  tagList: string[];
}

export interface ArticlesRepository {
  create(input: {
    slug: string;
    title: string;
    description?: string;
    body: string;
    authorId: string;
    tagList: string[];
  }): Promise<ArticleViewDTO>;
  findBySlug(slug: string): Promise<ArticleViewDTO | null>;
  updateBySlug(
    slug: string,
    input: {
      title?: string;
      description?: string;
      body?: string;
      tagList?: string[];
    },
  ): Promise<ArticleViewDTO | null>;
  deleteBySlug(slug: string): Promise<boolean>;
  list(input: {
    page: number;
    pageSize: number;
  }): Promise<{ items: ArticleViewDTO[]; total: number }>;
}
