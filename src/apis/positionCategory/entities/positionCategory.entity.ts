import { Field, ObjectType } from '@nestjs/graphql';
import { Career } from 'src/apis/career/entities/career.entity';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@ObjectType()
export class PositionCategory {
  @PrimaryColumn() // 문자열로 저장
  @Field(() => String)
  id: string;

  @Column()
  @Field(() => String)
  name: string;

  @Column({ default: false })
  @Field(() => Boolean)
  isCustom: boolean;

  @OneToMany(() => Career, (career) => career.positionCategory)
  @Field(() => [Career])
  careers: Career[];

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}