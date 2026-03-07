import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Major } from './entities/major.entity';
import { MajorService } from './major.service';
import { MajorResolver } from './major.resolver';

@Module({
  imports: [TypeOrmModule.forFeature([Major])],
  providers: [MajorService, MajorResolver],
  exports: [MajorService],
})
export class MajorModule {}
