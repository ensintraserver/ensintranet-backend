import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionCategory } from './entities/positionCategory.entity';
import { CreatePositionCategoryInput } from './dto/create-position-category.input';

@Injectable()
export class PositionCategoryService {
  constructor(
    @InjectRepository(PositionCategory)
    private readonly positionCategoryRepository: Repository<PositionCategory>,
  ) {}

  async findAll(): Promise<PositionCategory[]> {
    return this.positionCategoryRepository.find({
      order: { id: 'ASC' }, // ID 순서로 정렬
    });
  }

  async findMaxNumericId(): Promise<number> {
    // 모든 PositionCategory 조회 (커스텀/일반 구분 없이)
    const allPositionCategories = await this.positionCategoryRepository.find();

    if (allPositionCategories.length === 0) {
      return 0;
    }

    // ID에서 숫자 부분 추출하여 최대값 찾기
    let maxNumber = 0;
    for (const positionCategory of allPositionCategories) {
      // ID에서 마지막 숫자 부분 추출 (예: "001", "CUSTOM_POS_001", "008" 등)
      const match = positionCategory.id.match(/(\d+)$/);
      if (match) {
        const number = parseInt(match[1], 10);
        if (number > maxNumber) {
          maxNumber = number;
        }
      }
    }

    return maxNumber;
  }

  async create({
    createPositionCategoryInput,
  }: {
    createPositionCategoryInput: CreatePositionCategoryInput;
  }): Promise<PositionCategory> {
    const { id, name, isCustom } = createPositionCategoryInput;

    // ID 중복 확인
    const existingPositionCategoryById = await this.positionCategoryRepository.findOne({ where: { id } });
    if (existingPositionCategoryById) {
      throw new ConflictException('이미 존재하는 직무 카테고리 ID입니다.');
    }

    // Name 중복 확인
    const existingPositionCategoryByName = await this.positionCategoryRepository.findOne({ where: { name } });
    if (existingPositionCategoryByName) {
      throw new ConflictException('이미 동일한 직무 카테고리가 있습니다.');
    }

    return this.positionCategoryRepository.save({
      id,
      name,
      isCustom: isCustom ?? false,
    });
  }
}
