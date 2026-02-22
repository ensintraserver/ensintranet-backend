import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DeleteCareerOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;
}