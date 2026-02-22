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
