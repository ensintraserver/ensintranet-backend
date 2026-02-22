import { InputType, PartialType } from '@nestjs/graphql';
import { CreateMajorInput } from './create-major.input';

@InputType()
export class UpdateMajorInput extends PartialType(CreateMajorInput) {}