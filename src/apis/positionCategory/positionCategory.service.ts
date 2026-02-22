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
