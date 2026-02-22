import { InputType, PartialType } from '@nestjs/graphql';
import { CreateIndustryInput } from './create-industry.input';

@InputType()
export class UpdateIndustryInput extends PartialType(CreateIndustryInput) {}
