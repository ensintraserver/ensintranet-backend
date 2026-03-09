import { Query, Resolver } from '@nestjs/graphql';
import { Major } from './entities/major.entity';
import { MajorService } from './major.service';
import { Public } from 'src/commons/decorators/public.decorator';

@Resolver(() => Major)
export class MajorResolver {
  constructor(private readonly majorService: MajorService) {}

  @Public()
  @Query(() => [Major], { name: 'fetchAllMajors' })
  async fetchAllMajors(): Promise<Major[]> {
    return this.majorService.findAll();
  }
}
