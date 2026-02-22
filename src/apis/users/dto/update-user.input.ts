// users/dto/update-user.input.ts
import { InputType, PartialType, Field } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';
import { CreateCareerInput } from 'src/apis/career/dto/create-career.input';

@InputType()
export class UpdateUserInput extends PartialType(CreateUserInput) {
  @Field(() => [CreateCareerInput], { nullable: true })
  careers?: CreateCareerInput[];
}
