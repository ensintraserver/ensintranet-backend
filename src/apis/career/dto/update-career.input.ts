import { InputType, PartialType } from '@nestjs/graphql';
import { CreateCareerInput } from './create-career.input';

@InputType()
export class UpdateCareerInput extends PartialType(CreateCareerInput) {}