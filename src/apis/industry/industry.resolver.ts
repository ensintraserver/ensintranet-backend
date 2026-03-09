import { Query, Resolver } from '@nestjs/graphql';
import { Industry } from './entities/industry.entity';
import { IndustryService } from './industry.service';
import { Public } from 'src/commons/decorators/public.decorator';

@Resolver(() => Industry)
export class IndustryResolver {
  constructor(private readonly industryService: IndustryService) {}

  // @Public()
  @Query(() => [Industry], { name: 'fetchAllIndustries' })
  async fetchAllIndustries(): Promise<Industry[]> {
    return this.industryService.findAll();
  }
}
