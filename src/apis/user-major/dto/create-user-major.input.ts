import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

/**
 * User 생성 시 nested input으로 사용하는 DTO
 * userId는 User 생성 후 자동으로 설정됨
 */
@InputType()
export class CreateUserMajorInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  majorId?: string; // 기존 Major ID (기타가 아닌 경우)

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  customMajorName?: string; // "기타" 항목 선택 시 사용자 입력 이름

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
