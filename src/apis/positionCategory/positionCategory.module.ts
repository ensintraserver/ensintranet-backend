import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionCategory } from './entities/positionCategory.entity';
import { PositionCategoryService } from './positionCategory.service';
import { PositionCategoryResolver } from './positionCategory.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([PositionCategory])],
  providers: [PositionCategoryService, PositionCategoryResolver],
  exports: [PositionCategoryService],
})
export class PositionCategoryModule {}
