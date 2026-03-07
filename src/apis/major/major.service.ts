import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Major } from './entities/major.entity';
import { CreateMajorInput } from './dto/create-major.input';

@Injectable()
export class MajorService {
  constructor(
    @InjectRepository(Major)
    private readonly majorRepository: Repository<Major>,
  ) {}

  async findAll(): Promise<Major[]> {
    return this.majorRepository.find({
      order: { id: 'ASC' }, // ID 순서로 정렬
    });
  }

  async findMaxNumericId(): Promise<number> {
    // 모든 Major 조회 (커스텀/일반 구분 없이)
    const allMajors = await this.majorRepository.find();

    if (allMajors.length === 0) {
      return 0;
    }

    // ID에서 숫자 부분 추출하여 최대값 찾기
    let maxNumber = 0;
    for (const major of allMajors) {
      // ID에서 마지막 숫자 부분 추출 (예: "001", "CUSTOM_MAJ_001", "008" 등)
      const match = major.id.match(/(\d+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    }

    return maxNumber;
  }

  async create({ createMajorInput }: { createMajorInput: CreateMajorInput }): Promise<Major> {
    const { id, name, isCustom } = createMajorInput;

    // ID 중복 확인
    const existingMajorById = await this.majorRepository.findOne({ where: { id } });
    if (existingMajorById) {
      throw new ConflictException('이미 존재하는 학과 ID입니다.');
    }

    // Name 중복 확인
    const existingMajorByName = await this.majorRepository.findOne({ where: { name } });
    if (existingMajorByName) {
      throw new ConflictException('이미 동일한 학과가 있습니다.');
    }

    return this.majorRepository.save({
      id,
      name,
      isCustom: isCustom ?? false,
    });
  }
}
