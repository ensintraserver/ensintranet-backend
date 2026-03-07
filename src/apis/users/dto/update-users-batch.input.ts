import { InputType, Field } from '@nestjs/graphql';
import { UpdateUserInput } from './update-user.input';

@InputType()
export class UpdateUserBatchItemInput {
  @Field(() => String)
  userId: string;

  @Field(() => UpdateUserInput)
  updateUserInput: UpdateUserInput;
}

@InputType()
export class UpdateUsersBatchInput {
  @Field(() => [UpdateUserBatchItemInput])
  updates: UpdateUserBatchItemInput[];
}
