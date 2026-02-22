import { Field, ObjectType } from '@nestjs/graphql';
import { Industry } from 'src/apis/industry/entities/industry.entity';
import { PositionCategory } from 'src/apis/positionCategory/entities/positionCategory.entity';
import { User } from 'src/apis/users/entities/user.entity';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
@ObjectType()
export class Career {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => String)
  id: string;

  @Column()
  @Field(() => String)
  company: string;

  @ManyToOne(() => PositionCategory, (positionCategory) => positionCategory.careers, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'positionCategoryId' })
  @Field(() => PositionCategory, { nullable: true })
  positionCategory: PositionCategory; // 직무 카테고리

  @Column()
  @Field(() => String)
  position: string; // 구체적 직무명

  @Column({ nullable: true })
  @Field(() => Date, { nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  @Field(() => Date, { nullable: true })
  endDate: Date;

  @Column({ default: false })
  @Field(() => Boolean)
  isCurrent: boolean;

  @Column({ default: false })
  @Field(() => Boolean)
  adminOnly: boolean;

  @ManyToOne(() => User, (user) => user.careers, {
    onDelete: 'CASCADE',
    // nullable: true 제거 - Career 생성 시 User가 필수
  })
  @JoinColumn({ name: 'userId' })
  @Field(() => User) // nullable 제거 - GraphQL에서도 필수
  user: User;

  @ManyToOne(() => Industry, (industry) => industry.careers, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'industryId' })
  @Field(() => Industry, { nullable: true })
  industry: Industry;

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}