import { InputType, Field } from '@nestjs/graphql';
import { CreateUserInput } from './create-user.input';

@InputType()
export class CreateUsersBatchInput {
  @Field(() => [CreateUserInput])
  users: CreateUserInput[];
}
