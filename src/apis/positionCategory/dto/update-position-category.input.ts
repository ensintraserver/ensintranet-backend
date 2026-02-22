import { InputType, PartialType } from '@nestjs/graphql';
import { CreatePositionCategoryInput } from './create-position-category.input';

@InputType()
export class UpdatePositionCategoryInput extends PartialType(CreatePositionCategoryInput) {}
