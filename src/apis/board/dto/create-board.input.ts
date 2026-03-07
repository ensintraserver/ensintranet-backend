import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { BoardCategory } from '../entities/board.entity';

@InputType()
export class CreateBoardInput {
  @Field(() => String)
  @IsString()
  title: string;

  @Field(() => BoardCategory, { nullable: true, defaultValue: BoardCategory.NOTICE })
  @IsEnum(BoardCategory)
  @IsOptional()
  category?: BoardCategory;

  @Field(() => String)
  @IsString()
  content: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
