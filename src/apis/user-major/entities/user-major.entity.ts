import { Field, ObjectType } from '@nestjs/graphql';
import { User } from 'src/apis/users/entities/user.entity';
import { Major } from 'src/apis/major/entities/major.entity';
import {
  Entity,
  ManyToOne,
  PrimaryColumn,
  Column,
  JoinColumn,
} from 'typeorm';

@Entity('user_major')
@ObjectType()
export class UserMajor {
  @PrimaryColumn({ name: 'userId' })
  @Field(() => String)
  userId: string;

  @PrimaryColumn({ name: 'majorId' })
  @Field(() => String)
  majorId: string;

  @ManyToOne(() => User, (user) => user.userMajors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  @Field(() => User)
  user: User;

  @ManyToOne(() => Major, (major) => major.userMajors, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'majorId' })
  @Field(() => Major)
  major: Major;

  @Column({ name: 'isPrimary', default: false })
  @Field(() => Boolean)
  isPrimary: boolean;
}