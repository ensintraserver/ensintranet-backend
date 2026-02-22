import { Field,  ObjectType } from '@nestjs/graphql';
import { UserMajor } from 'src/apis/user-major/entities/user-major.entity';


import {
  Column,

  Entity,

  OneToMany,

  PrimaryColumn,

} from 'typeorm';

@Entity()
@ObjectType()
export class Major {
  @PrimaryColumn() // 문자열로 저장
  @Field(() => String)
  id: string;

  @Column()
  @Field(() => String)
  name: string;

  @Column({ default: false })
  @Field(() => Boolean)
  isCustom: boolean;

  @OneToMany(() => UserMajor, (userMajor) => userMajor.major)
  @Field(() => [UserMajor])
  userMajors: UserMajor[];


}
