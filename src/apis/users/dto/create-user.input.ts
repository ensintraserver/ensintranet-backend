import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsEmail,
  MinLength,
  IsInt,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { CreateUserMajorInput } from 'src/apis/user-major/dto/create-user-major.input';

@InputType()
export class CreateUserInput {
  @Field(() => String)
  @IsString()
  @Matches(/\d{2}기_/, {
    message: 'customId must contain the format "00기_" (e.g., "01기_", "02기_")',
  })
  customId: string;

  // 회원가입 STEP에서 입력받는 공통 인증번호
  // - 필드는 nullable로 두고
  // - 실제 검증은 서비스(UsersService.create)에서 처리
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  authCode?: string;

  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => String, { nullable: true })
  @IsEmail()
  @IsOptional()
  email?: string;

  @Field(() => String)
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field(() => Int)
  @IsInt()
  generation: number;

  @Field(() => Int)
  @IsInt()
  entrance: number;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  linkedin?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  noCoffeeChat?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  abroad?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  agreeTerms?: boolean; // 이용약관 동의

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  agreePrivacy?: boolean; // 개인정보 수집 및 이용 동의

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  agreeAge?: boolean; // 만 14세 이상

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  memo?: string;

  @Field(() => UserRole, { nullable: true, defaultValue: UserRole.MEMBER })
  @IsOptional()
  role?: UserRole;

  @Field(() => [CreateUserMajorInput], { nullable: true })
  @IsOptional()
  userMajors?: CreateUserMajorInput[];
}