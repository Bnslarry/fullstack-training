import { Controller, Get } from '@nestjs/common';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  async list() {
    const tags = await this.tags.list();
    return { data: { tags } };
  }
}
