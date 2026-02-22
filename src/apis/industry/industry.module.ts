import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Industry } from './entities/industry.entity';
import { IndustryService } from './industry.service';

@Module({
  imports: [TypeOrmModule.forFeature([Industry])],
  providers: [IndustryService],
  exports: [IndustryService],
})
export class IndustryModule {}
