import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsDateString,
} from 'class-validator';

@InputType()
export class CreateCareerInput {
  @Field(() => String)
  @IsString()
  company: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  positionCategoryId?: string; // 기존 PositionCategory ID (기타가 아닌 경우)

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  customPositionCategoryName?: string; // "기타" 항목 선택 시 사용자 입력 이름

  @Field(() => String)
  @IsString()
  position: string;

  @Field(() => String, { nullable: true })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @Field(() => String, { nullable: true })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  isCurrent?: boolean;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  adminOnly?: boolean;

  @Field(() => String)
  @IsString()
  userId: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  industryId?: string; // 기존 Industry ID (기타가 아닌 경우)

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  customIndustryName?: string; // "기타" 항목 선택 시 사용자 입력 이름
}