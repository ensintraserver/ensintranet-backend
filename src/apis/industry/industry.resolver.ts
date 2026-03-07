import { Query, Resolver } from '@nestjs/graphql';
import { Industry } from './entities/industry.entity';
import { IndustryService } from './industry.service';

@Resolver(() => Industry)
export class IndustryResolver {
  constructor(private readonly industryService: IndustryService) {}

  @Query(() => [Industry], { name: 'fetchAllIndustries' })
  async fetchAllIndustries(): Promise<Industry[]> {
    return this.industryService.findAll();
  }
}
