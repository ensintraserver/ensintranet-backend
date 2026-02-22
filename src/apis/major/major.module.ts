import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Major } from './entities/major.entity';
import { MajorService } from './major.service';

@Module({
  imports: [TypeOrmModule.forFeature([Major])],
  providers: [MajorService],
  exports: [MajorService],
})
export class MajorModule {}
