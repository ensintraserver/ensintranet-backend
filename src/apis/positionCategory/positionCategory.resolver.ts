import { Query, Resolver } from '@nestjs/graphql';
import { PositionCategory } from './entities/positionCategory.entity';
import { PositionCategoryService } from './positionCategory.service';
import { Public } from 'src/commons/decorators/public.decorator';

@Resolver(() => PositionCategory)
export class PositionCategoryResolver {
  constructor(private readonly positionCategoryService: PositionCategoryService) {}

  // @Public()
  @Query(() => [PositionCategory], { name: 'fetchAllPositionCategories' })
  async fetchAllPositionCategories(): Promise<PositionCategory[]> {
    return this.positionCategoryService.findAll();
  }
}
