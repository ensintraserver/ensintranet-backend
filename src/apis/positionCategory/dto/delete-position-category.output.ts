import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DeletePositionCategoryOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;
}
