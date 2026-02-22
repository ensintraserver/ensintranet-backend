import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DeleteUserMajorOutput {
  @Field(() => String)
  userId: string;

  @Field(() => String)
  majorId: string;

  @Field(() => String)
  message: string;
}
