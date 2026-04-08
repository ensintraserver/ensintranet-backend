// users/dto/update-user.input.ts
import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { CreateUserMajorInput } from 'src/apis/user-major/dto/create-user-major.input';
import { CreateCareerInput } from 'src/apis/career/dto/create-career.input';

@InputType()
export class UpdateUserInput {
  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  @Matches(/\d{2}기_/, {
    message: 'customId must contain the format "00기_" (e.g., "01기_", "02기_")',
  })
  customId?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field(() => String, { nullable: true })
  @IsEmail()
  @IsOptional()
  email?: string;

  @Field(() => String, { nullable: true })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsOptional()
  password?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  currentPassword?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  phone?: string;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  generation?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @IsOptional()
  entrance?: number;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  linkedin?: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  noCoffeeChat?: boolean;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  abroad?: boolean;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  memo?: string;

  // Update에서는 defaultValue를 두지 않아서, 클라이언트가 보낼 때만 반영되게 함
  @Field(() => UserRole, { nullable: true })
  @IsOptional()
  role?: UserRole;

  @Field(() => [CreateUserMajorInput], { nullable: true })
  @IsOptional()
  userMajors?: CreateUserMajorInput[];

  @Field(() => [CreateCareerInput], { nullable: true })
  @IsOptional()
  careers?: CreateCareerInput[];
}
