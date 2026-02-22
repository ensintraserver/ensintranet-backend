import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

@InputType()
export class CreateIndustryInput {
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
