import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionCategory } from './entities/positionCategory.entity';
import { PositionCategoryService } from './positionCategory.service';

@Module({
  imports: [TypeOrmModule.forFeature([PositionCategory])],
  providers: [PositionCategoryService],
  exports: [PositionCategoryService],
})
export class PositionCategoryModule {}
