import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Industry } from './entities/industry.entity';
import { IndustryService } from './industry.service';
import { IndustryResolver } from './industry.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Industry])],
  providers: [IndustryService, IndustryResolver],
  exports: [IndustryService],
})
export class IndustryModule {}
