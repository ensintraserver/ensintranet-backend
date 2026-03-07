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

  async findAll(): Promise<Industry[]> {
    return this.industryRepository.find({
      order: { id: 'ASC' }, // ID 순서로 정렬
    });
  }

  async findMaxNumericId(): Promise<number> {
    // 모든 Industry 조회 (커스텀/일반 구분 없이)
    const allIndustries = await this.industryRepository.find();

    if (allIndustries.length === 0) {
      return 0;
    }

    // ID에서 숫자 부분 추출하여 최대값 찾기
    let maxNumber = 0;
    for (const industry of allIndustries) {
      // ID에서 마지막 숫자 부분 추출 (예: "001", "CUSTOM_IND_001", "008" 등)
      const match = industry.id.match(/(\d+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    }

    return maxNumber;
  }

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
