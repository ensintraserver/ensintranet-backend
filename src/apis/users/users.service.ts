// users.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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
  IUsersServiceFindOneByCustomId,
  IUsersServiceFindOneById,
  IUsersServiceUpdate,
  IUsersServiceUpdateBatch,
  IUsersServiceUpdatePasswordByResetToken,
} from './interfaces/user-service.interface';
import { CreateUserInput } from './dto/create-user.input';
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

  findOneByCustomId({ customId }: IUsersServiceFindOneByCustomId): Promise<User> {
    return this.usersRepository.findOne({ where: { customId } });
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
      authCode,
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
      agreeTerms,
      agreePrivacy,
      agreeAge,
      memo,
      role,
      userMajors,
    } = createUserInput;

    // 회원가입 인증번호 2차 검증 (프론트는 입력값만 받고 서버에서 비교)
    const expectedAuthCode = (process.env.SIGNUP_AUTH_CODE ?? '').trim();
    if (!expectedAuthCode) {
      throw new BadRequestException('서버 인증 설정이 누락되었습니다.');
    }

    if (!authCode?.trim() || authCode.trim() !== expectedAuthCode) {
      throw new BadRequestException('인증번호가 올바르지 않습니다.');
    }

    // 이메일 중복 확인 (email이 있을 때만)
    if (email) {
      const existingUser = await this.findOneByEmail({ email });
      if (existingUser) {
        throw new ConflictException('이미 등록된 이메일입니다.');
      }
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
      agreeTerms: agreeTerms ?? false,
      agreePrivacy: agreePrivacy ?? false,
      agreeAge: agreeAge ?? false,
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
          // 테이블의 모든 ID 중 가장 큰 숫자 찾기
          const maxNumericId = await this.majorService.findMaxNumericId();
          const nextNumber = maxNumericId + 1;
          const customId = String(nextNumber).padStart(3, '0');
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

  async createBatch({
    createUserInputs,
  }: {
    createUserInputs: CreateUserInput[];
  }): Promise<User[]> {
    // 트랜잭션으로 처리
    return this.usersRepository.manager.transaction(async (transactionalEntityManager) => {
      // 1. 모든 이메일 중복 체크 (한 번에) - undefined/null 제거
      const emails = createUserInputs
        .map(input => input.email)
        .filter((email): email is string => email !== undefined && email !== null);
      
      const existingUsers = emails.length > 0
        ? await transactionalEntityManager.find(User, {
            where: { email: In(emails) },
          })
        : [];
      
      const existingEmails = new Set(existingUsers.map(u => u.email));
      
      // 중복된 이메일이 있으면 에러
      const duplicateEmails = emails.filter(email => existingEmails.has(email));
      if (duplicateEmails.length > 0) {
        throw new ConflictException(
          `다음 이메일이 이미 등록되어 있습니다: ${duplicateEmails.join(', ')}`
        );
      }
      
      // customId 중복 체크
      const customIds = createUserInputs.map(input => input.customId);
      const existingCustomIds = await transactionalEntityManager.find(User, {
        where: { customId: In(customIds) },
      });
      const existingCustomIdSet = new Set(existingCustomIds.map(u => u.customId));
      const duplicateCustomIds = customIds.filter(customId => existingCustomIdSet.has(customId));
      if (duplicateCustomIds.length > 0) {
        throw new ConflictException(
          `다음 아이디가 이미 등록되어 있습니다: ${duplicateCustomIds.join(', ')}`
        );
      }
      
      // 입력 데이터 내부 중복 체크
      if (emails.length > 0) {
        const emailSet = new Set(emails);
        if (emailSet.size !== emails.length) {
          const duplicates = emails.filter((email, index) => emails.indexOf(email) !== index);
          throw new ConflictException(
            `입력 데이터 내에 중복된 이메일이 있습니다: ${[...new Set(duplicates)].join(', ')}`
          );
        }
      }
      
      const customIdSet = new Set(customIds);
      if (customIdSet.size !== customIds.length) {
        const duplicates = customIds.filter((customId, index) => customIds.indexOf(customId) !== index);
        throw new ConflictException(
          `입력 데이터 내에 중복된 아이디가 있습니다: ${[...new Set(duplicates)].join(', ')}`
        );
      }
      
      // 2. 모든 비밀번호 해싱 (병렬 처리)
      const passwordHashes = await Promise.all(
        createUserInputs.map(input => bcrypt.hash(input.password, 10))
      );
      
      // 3. 모든 유저 생성 (배치 insert)
      const usersToCreate = createUserInputs.map((input, index) => ({
        customId: input.customId,
        email: input.email,
        password: passwordHashes[index],
        name: input.name,
        phone: input.phone,
        generation: input.generation,
        entrance: input.entrance,
        imageUrl: input.imageUrl,
        linkedin: input.linkedin,
        noCoffeeChat: input.noCoffeeChat ?? false,
        abroad: input.abroad ?? false,
        agreeTerms: input.agreeTerms ?? false,
        agreePrivacy: input.agreePrivacy ?? false,
        agreeAge: input.agreeAge ?? false,
        memo: input.memo,
        role: input.role ?? UserRole.MEMBER,
      }));
      
      const createdUsersEntities = await transactionalEntityManager.save(User, usersToCreate);
      
      // 4. UserMajor 처리 (필요한 경우)
      const allUserMajors = [];
      for (let i = 0; i < createUserInputs.length; i++) {
        const input = createUserInputs[i];
        const user = createdUsersEntities[i];
        
        if (input.userMajors && input.userMajors.length > 0) {
          let hasPrimary = false;
          
          for (const um of input.userMajors) {
            let majorId = um.majorId;
            
            // 커스텀 전공 생성
            if (um.customMajorName && !um.majorId) {
              const maxNumericId = await this.majorService.findMaxNumericId();
              const nextNumber = maxNumericId + 1;
              const customId = String(nextNumber).padStart(3, '0');
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
              let isPrimary = false;
              if (um.isPrimary && !hasPrimary) {
                isPrimary = true;
                hasPrimary = true;
              } else if (!hasPrimary && allUserMajors.filter(um => um.userId === user.id).length === 0) {
                isPrimary = true;
                hasPrimary = true;
              }
              
              allUserMajors.push(
                transactionalEntityManager.create(UserMajor, {
                  userId: user.id,
                  majorId,
                  isPrimary,
                })
              );
            }
          }
        }
      }
      
      if (allUserMajors.length > 0) {
        await transactionalEntityManager.save(UserMajor, allUserMajors);
      }
      
      // 5. 관계 포함하여 다시 조회
      const finalUsers = await transactionalEntityManager.find(User, {
        where: createdUsersEntities.map(u => ({ id: u.id })),
        relations: ['userMajors', 'userMajors.major'],
      });
      
      return finalUsers;
    });
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
      currentPassword,
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

    // 비밀번호 변경 시 기존 비밀번호 확인
    if (password) {
      if (!currentPassword) {
        throw new BadRequestException('기존 비밀번호를 입력해주세요.');
      }

      const hasLowerCase = /[a-z]/.test(password);
      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumber = /\d/.test(password);
      const hasSpecialChar = /[@$!%*?&]/.test(password);
      if (
        password.length < 8 ||
        !hasLowerCase ||
        !hasUpperCase ||
        !hasNumber ||
        !hasSpecialChar
      ) {
        throw new BadRequestException(
          '8자리 이상의 대소문자, 숫자, 특수문자를 사용해 주세요.',
        );
      }
      
      // 기존 비밀번호 검증
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('기존 비밀번호가 일치하지 않습니다.');
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
            // 테이블의 모든 ID 중 가장 큰 숫자 찾기
            const maxNumericId = await this.majorService.findMaxNumericId();
            const nextNumber = maxNumericId + 1;
            const customId = String(nextNumber).padStart(3, '0');
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
            const maxNumericId = await this.positionCategoryService.findMaxNumericId();
            const nextNumber = maxNumericId + 1;
            const customId = String(nextNumber).padStart(3, '0');
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
            const maxNumericId = await this.industryService.findMaxNumericId();
            const nextNumber = maxNumericId + 1;
            const customId = String(nextNumber).padStart(3, '0');
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

  async updatePasswordByResetToken({
    userId,
    newPassword,
  }: IUsersServiceUpdatePasswordByResetToken): Promise<User> {
    // 1. 사용자 조회
    const user = await this.findOneById({ id: userId });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 2. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 3. 비밀번호 업데이트 (관계 필드는 제외하고 저장)
    const { userMajors: _, careers: __, ...userWithoutRelations } = user;
    const updatedUser = await this.usersRepository.save({
      ...userWithoutRelations,
      password: hashedPassword,
    });

    return updatedUser;
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

  async updateBatch({
    updates,
  }: IUsersServiceUpdateBatch): Promise<User[]> {
    // 트랜잭션으로 처리하여 일관성 보장
    return this.usersRepository.manager.transaction(async (transactionalEntityManager) => {
      const updatedUsers: User[] = [];
      
      for (const { userId, updateUserInput } of updates) {
        // 기존 update 로직을 재사용하되, 트랜잭션 내에서 처리
        const user = await transactionalEntityManager.findOne(User, { 
          where: { id: userId },
          relations: ['userMajors', 'userMajors.major', 'careers', 'careers.positionCategory', 'careers.industry'],
        });
        
        if (!user) {
          throw new NotFoundException(`유저 ID ${userId}를 찾을 수 없습니다.`);
        }

        const {
          customId,
          email,
          password,
          currentPassword,
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
          const existingUser = await transactionalEntityManager.findOne(User, { where: { email } });
          if (existingUser) {
            throw new ConflictException(`이미 등록된 이메일입니다: ${email}`);
          }
        }

        // 비밀번호 변경 시 기존 비밀번호 확인
        if (password) {
          if (!currentPassword) {
            throw new BadRequestException('기존 비밀번호를 입력해주세요.');
          }
          
          const isPasswordValid = await bcrypt.compare(
            currentPassword,
            user.password,
          );
          
          if (!isPasswordValid) {
            throw new UnauthorizedException('기존 비밀번호가 일치하지 않습니다.');
          }
        }

        const hashedPassword = password
          ? await bcrypt.hash(password, 10)
          : undefined;

        // User 업데이트
        const { userMajors: _, careers: __, ...userWithoutRelations } = user;
        const updatedUser = await transactionalEntityManager.save(User, {
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
          await transactionalEntityManager.delete(UserMajor, { userId: user.id });

          if (userMajors.length > 0) {
            const userMajorEntities = [];
            let hasPrimary = false;

            for (const um of userMajors) {
              let majorId = um.majorId;

              if (um.customMajorName && !um.majorId) {
                const maxNumericId = await this.majorService.findMaxNumericId();
                const nextNumber = maxNumericId + 1;
                const customId = String(nextNumber).padStart(3, '0');
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
                userMajorEntities.push({
                  userId: user.id,
                  majorId,
                  isPrimary: um.isPrimary || false,
                });
                if (um.isPrimary) hasPrimary = true;
              }
            }

            if (userMajorEntities.length > 0) {
              if (!hasPrimary && userMajorEntities.length > 0) {
                userMajorEntities[0].isPrimary = true;
              }
              await transactionalEntityManager.save(UserMajor, userMajorEntities);
            }
          }
        }

        // Career 업데이트 (있는 경우)
        if (careers !== undefined) {
          await transactionalEntityManager.delete(Career, { user: { id: user.id } });

          if (careers.length > 0) {
            const careerEntities = [];

            for (const careerInput of careers) {
              const careerEntity: Partial<Career> = {
                company: careerInput.company,
                position: careerInput.position,
                startDate: careerInput.startDate ? new Date(careerInput.startDate) : null,
                endDate: careerInput.endDate ? new Date(careerInput.endDate) : null,
                isCurrent: careerInput.isCurrent || false,
                adminOnly: careerInput.adminOnly || false,
                user: { id: user.id } as User,
              };

              // PositionCategory 처리
              if (careerInput.positionCategoryId) {
                careerEntity.positionCategory = { id: careerInput.positionCategoryId } as any;
              } else if (careerInput.customPositionCategoryName) {
                const maxNumericId = await this.positionCategoryService.findMaxNumericId();
                const nextNumber = maxNumericId + 1;
                const customId = String(nextNumber).padStart(3, '0');
                const newPositionCategory = await this.positionCategoryService.create({
                  createPositionCategoryInput: {
                    id: customId,
                    name: careerInput.customPositionCategoryName,
                    isCustom: true,
                  },
                });
                careerEntity.positionCategory = { id: newPositionCategory.id } as any;
              }

              // Industry 처리
              if (careerInput.industryId) {
                careerEntity.industry = { id: careerInput.industryId } as any;
              } else if (careerInput.customIndustryName) {
                const maxNumericId = await this.industryService.findMaxNumericId();
                const nextNumber = maxNumericId + 1;
                const customId = String(nextNumber).padStart(3, '0');
                const newIndustry = await this.industryService.create({
                  createIndustryInput: {
                    id: customId,
                    name: careerInput.customIndustryName,
                    isCustom: true,
                  },
                });
                careerEntity.industry = { id: newIndustry.id } as any;
              }

              careerEntities.push(careerEntity);
            }

            if (careerEntities.length > 0) {
              await transactionalEntityManager.save(Career, careerEntities as Career[]);
            }
          }
        }

        // 업데이트된 유저를 다시 조회하여 반환
        const finalUser = await transactionalEntityManager.findOne(User, {
          where: { id: user.id },
          relations: ['userMajors', 'userMajors.major', 'careers', 'careers.positionCategory', 'careers.industry'],
        });
        
        if (finalUser) {
          updatedUsers.push(finalUser);
        }
      }
      
      return updatedUsers;
    });
  }

}
