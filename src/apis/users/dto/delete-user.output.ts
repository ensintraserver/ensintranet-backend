import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DeleteUserOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;
}
