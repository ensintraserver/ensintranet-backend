import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DeleteMajorOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;
}