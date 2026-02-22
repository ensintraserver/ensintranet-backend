import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

/**
 * UserMajor를 별도로 생성할 때 사용하는 DTO
 * userId를 명시적으로 받음
 */
@InputType()
export class CreateUserMajorStandaloneInput {
  @Field(() => String)
  @IsString()
  userId: string;

  @Field(() => String)
  @IsString()
  majorId: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}
