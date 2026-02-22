// users.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { UserMajor } from 'src/apis/user-major/entities/user-major.entity';
import { Career } from 'src/apis/career/entities/career.entity';
import { MajorService } from 'src/apis/major/major.service';
import { IndustryService } from 'src/apis/industry/industry.service';
import { PositionCategoryService } from 'src/apis/positionCategory/positionCategory.service';
import {
  IUsersServiceCreate,
  IUsersServiceDelete,
  IUsersServiceFindAll,
  IUsersServiceFindOneByEmail,
  IUsersServiceFindOneById,
  IUsersServiceUpdate,
} from './interfaces/user-service.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserMajor)
    private readonly userMajorRepository: Repository<UserMajor>,
    @InjectRepository(Career)
    private readonly careerRepository: Repository<Career>,
    private readonly majorService: MajorService,
    private readonly industryService: IndustryService,
    private readonly positionCategoryService: PositionCategoryService,
  ) {}

  findOneByEmail({ email }: IUsersServiceFindOneByEmail): Promise<User> {
    return this.usersRepository.findOne({ where: { email } });
  }

  findOneById({ id }: IUsersServiceFindOneById): Promise<User> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['userMajors', 'userMajors.major', 'careers', 'careers.positionCategory', 'careers.industry'],
    });
  }

  async findAll({}: IUsersServiceFindAll): Promise<User[]> {
    return this.usersRepository.find({
      relations: ['userMajors', 'userMajors.major', 'careers', 'careers.positionCategory', 'careers.industry'],
      order: {
        createdAt: 'DESC', // 최신순 정렬
      },
    });
  }

  async create({ createUserInput }: IUsersServiceCreate): Promise<User> {
    const {
      customId,
      email,
      password,
      name,
      phone,
      generation,
      entrance,
      imageUrl,
      linkedin,
      noCoffeeChat,
      abroad,
      memo,
      role,
      userMajors,
    } = createUserInput;

    // 이메일 중복 확인
    const existingUser = await this.findOneByEmail({ email });
    if (existingUser) {
      throw new ConflictException('이미 등록된 이메일입니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // User 생성
    const user = await this.usersRepository.save({
      customId,
      email,
      password: hashedPassword,
      name,
      phone,
      generation,
      entrance,
      imageUrl,
      linkedin,
      noCoffeeChat: noCoffeeChat ?? false,
      abroad: abroad ?? false,
      memo,
      role: role ?? UserRole.MEMBER,
    });

    // UserMajor 저장 (있는 경우)
    if (userMajors && userMajors.length > 0) {
      const userMajorEntities = [];
      let hasPrimary = false; // isPrimary가 true인 항목이 있는지 확인

      for (const um of userMajors) {
        let majorId = um.majorId;

        // "기타" 항목인 경우 Major 생성
        if (um.customMajorName && !um.majorId) {
          // ID 생성 (예: "CUSTOM_001", "CUSTOM_002" 등)
          const customId = `CUSTOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const newMajor = await this.majorService.create({
            createMajorInput: {
              id: customId,
              name: um.customMajorName,
              isCustom: true,
            },
          });
          majorId = newMajor.id;
        }

        if (majorId) {
          // isPrimary 처리: 첫 번째 isPrimary: true만 유지
          let isPrimary = false;
          if (um.isPrimary && !hasPrimary) {
            isPrimary = true;
            hasPrimary = true;
          } else if (!hasPrimary && userMajorEntities.length === 0) {
            // isPrimary가 하나도 없으면 첫 번째 항목을 자동으로 isPrimary로 설정
            isPrimary = true;
            hasPrimary = true;
          }

          userMajorEntities.push(
            this.userMajorRepository.create({
              userId: user.id,
              majorId,
              isPrimary,
            }),
          );
        }
      }
      if (userMajorEntities.length > 0) {
        await this.userMajorRepository.save(userMajorEntities);
      }
    }

    return user;
  }

  async update({
    userId,
    updateUserInput,
  }: IUsersServiceUpdate): Promise<User> {
    const user = await this.findOneById({ id: userId });
    if (!user) {
      throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
    }

    const {
      customId,
      email,
      password,
      name,
      phone,
      generation,
      entrance,
      imageUrl,
      linkedin,
      noCoffeeChat,
      abroad,
      memo,
      role,
      userMajors,
      careers,
    } = updateUserInput;

    // 이메일 변경 시 중복 확인
    if (email !== undefined && email !== user.email) {
      const existingUser = await this.findOneByEmail({ email });
      if (existingUser) {
        throw new ConflictException('이미 등록된 이메일입니다.');
      }
    }

    // password가 있을 때만 해싱
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    // User 업데이트 (관계 필드는 제외하고 저장)
    const { userMajors: _, careers: __, ...userWithoutRelations } = user;
    const updatedUser = await this.usersRepository.save({
      ...userWithoutRelations,
      ...(customId !== undefined && { customId }),
      ...(email !== undefined && { email }),
      ...(name !== undefined && { name }),
      ...(phone !== undefined && { phone }),
      ...(generation !== undefined && { generation }),
      ...(entrance !== undefined && { entrance }),
      ...(noCoffeeChat !== undefined && { noCoffeeChat }),
      ...(abroad !== undefined && { abroad }),
      ...(role !== undefined && { role }),
      ...(hashedPassword && { password: hashedPassword }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(linkedin !== undefined && { linkedin }),
      ...(memo !== undefined && { memo }),
    });

    // UserMajor 업데이트 (있는 경우)
    if (userMajors !== undefined) {
      // 기존 UserMajor 삭제
      await this.userMajorRepository.delete({ userId: user.id });

      // 새로운 UserMajor 생성
      if (userMajors.length > 0) {
        const userMajorEntities = [];
        let hasPrimary = false; // isPrimary가 true인 항목이 있는지 확인

        for (const um of userMajors) {
          let majorId = um.majorId;

          // "기타" 항목인 경우 Major 생성
          if (um.customMajorName && !um.majorId) {
            // ID 생성
            const customId = `CUSTOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newMajor = await this.majorService.create({
              createMajorInput: {
                id: customId,
                name: um.customMajorName,
                isCustom: true,
              },
            });
            majorId = newMajor.id;
          }

          if (majorId) {
            // isPrimary 처리: 첫 번째 isPrimary: true만 유지
            let isPrimary = false;
            if (um.isPrimary && !hasPrimary) {
              isPrimary = true;
              hasPrimary = true;
            } else if (!hasPrimary && userMajorEntities.length === 0) {
              // isPrimary가 하나도 없으면 첫 번째 항목을 자동으로 isPrimary로 설정
              isPrimary = true;
              hasPrimary = true;
            }

            userMajorEntities.push(
              this.userMajorRepository.create({
                userId: user.id,
                majorId,
                isPrimary,
              }),
            );
          }
        }
        if (userMajorEntities.length > 0) {
          await this.userMajorRepository.save(userMajorEntities);
        }
      }
    }

    // Careers 업데이트 (있는 경우)
    if (careers !== undefined) {
      // 기존 Careers 삭제
      await this.careerRepository.delete({ user: { id: user.id } });

      // 새로운 Careers 생성
      if (careers.length > 0) {
        const careerEntities = [];
        for (const career of careers) {
          const careerData: Partial<Career> = {
            company: career.company,
            position: career.position,
            startDate: career.startDate ? new Date(career.startDate) : undefined,
            endDate: career.endDate ? new Date(career.endDate) : undefined,
            isCurrent: career.isCurrent ?? false,
            adminOnly: career.adminOnly ?? false,
            user: { id: user.id } as User,
          };

          // PositionCategory 처리 ("기타" 항목인 경우 생성)
          if (career.customPositionCategoryName && !career.positionCategoryId) {
            const customId = `CUSTOM_POS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newPositionCategory = await this.positionCategoryService.create({
              createPositionCategoryInput: {
                id: customId,
                name: career.customPositionCategoryName,
                isCustom: true,
              },
            });
            careerData.positionCategory = { id: newPositionCategory.id } as any;
          } else if (career.positionCategoryId) {
            careerData.positionCategory = { id: career.positionCategoryId } as any;
          }

          // Industry 처리 ("기타" 항목인 경우 생성)
          if (career.customIndustryName && !career.industryId) {
            const customId = `CUSTOM_IND_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newIndustry = await this.industryService.create({
              createIndustryInput: {
                id: customId,
                name: career.customIndustryName,
                isCustom: true,
              },
            });
            careerData.industry = { id: newIndustry.id } as any;
          } else if (career.industryId) {
            careerData.industry = { id: career.industryId } as any;
          }

          careerEntities.push(careerData);
        }
        await this.careerRepository.save(careerEntities as Career[]);
      }
    }

        // 관계를 포함한 User를 다시 조회해서 반환
        return await this.usersRepository.findOne({
          where: { id: user.id },
          relations: ['userMajors', 'userMajors.major', 'careers', 'careers.positionCategory', 'careers.industry'],
        });
  }

  async delete({ userId }: IUsersServiceDelete): Promise<string> {
    const user = await this.findOneById({ id: userId });
    if (!user) {
      throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
    }
  
    const { affected } = await this.usersRepository.softDelete({ id: userId });
  
    if (!affected) {
      throw new NotFoundException('유저 삭제에 실패했습니다.');
    }
  
    return '유저 삭제에 성공했습니다.';
  }




}
