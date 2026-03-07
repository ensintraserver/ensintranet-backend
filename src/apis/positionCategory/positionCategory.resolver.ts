import { Query, Resolver } from '@nestjs/graphql';
import { PositionCategory } from './entities/positionCategory.entity';
import { PositionCategoryService } from './positionCategory.service';

@Resolver(() => PositionCategory)
export class PositionCategoryResolver {
  constructor(private readonly positionCategoryService: PositionCategoryService) {}

  @Query(() => [PositionCategory], { name: 'fetchAllPositionCategories' })
  async fetchAllPositionCategories(): Promise<PositionCategory[]> {
    return this.positionCategoryService.findAll();
  }
}
