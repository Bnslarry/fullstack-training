import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const tags = await this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
      select: { name: true },
    });
    return tags.map((t) => t.name);
  }
}
