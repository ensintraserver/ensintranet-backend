import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateMajorInput {
  @Field(() => String)
  @IsString()
  id: string;

  @Field(() => String)
  @IsString()
  name: string;

  @Field(() => Boolean, { nullable: true, defaultValue: false })
  @IsBoolean()
  @IsOptional()
  isCustom?: boolean;
}