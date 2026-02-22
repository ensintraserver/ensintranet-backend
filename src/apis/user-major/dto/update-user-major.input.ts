import { InputType, PartialType } from '@nestjs/graphql';
import { CreateUserMajorStandaloneInput } from './create-user-major-standalone.input';

@InputType()
export class UpdateUserMajorInput extends PartialType(CreateUserMajorStandaloneInput) {}
