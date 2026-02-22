import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DeleteIndustryOutput {
  @Field(() => String)
  id: string;

  @Field(() => String)
  message: string;
}
