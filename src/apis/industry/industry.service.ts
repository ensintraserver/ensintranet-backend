import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Industry } from './entities/industry.entity';
import { CreateIndustryInput } from './dto/create-industry.input';

@Injectable()
export class IndustryService {
  constructor(
    @InjectRepository(Industry)
    private readonly industryRepository: Repository<Industry>,
  ) {}

  async create({ createIndustryInput }: { createIndustryInput: CreateIndustryInput }): Promise<Industry> {
    const { id, name, isCustom } = createIndustryInput;

    // ID 중복 확인
    const existingIndustryById = await this.industryRepository.findOne({ where: { id } });
    if (existingIndustryById) {
      throw new ConflictException('이미 존재하는 산업 ID입니다.');
    }

    // Name 중복 확인
    const existingIndustryByName = await this.industryRepository.findOne({ where: { name } });
    if (existingIndustryByName) {
      throw new ConflictException('이미 동일한 산업이 있습니다.');
    }

    return this.industryRepository.save({
      id,
      name,
      isCustom: isCustom ?? false,
    });
  }
}
