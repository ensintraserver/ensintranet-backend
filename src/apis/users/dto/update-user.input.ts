// users/dto/update-user.input.ts
import { InputType, PartialType, Field } from '@nestjs/graphql';
import { IsString, IsOptional } from 'class-validator';
import { CreateUserInput } from './create-user.input';
import { CreateCareerInput } from 'src/apis/career/dto/create-career.input';
import { UserRole } from '../entities/user.entity';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  role?: UserRole;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @Field(() => [CreateCareerInput], { nullable: true })
  careers?: CreateCareerInput[];
}
