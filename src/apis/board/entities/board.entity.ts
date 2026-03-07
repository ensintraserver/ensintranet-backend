import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
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

// Enum 정의
export enum BoardCategory {
    NOTICE = 'NOTICE',           // 공지
    RECRUITMENT = 'RECRUITMENT', // 채용공고
    ETC = 'ETC',                 // 기타
  }

// GraphQL에 Enum 등록
registerEnumType(BoardCategory, {
  name: 'BoardCategory',
});

@Entity()
@ObjectType()
export class Board {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => String)
  id: string;

  @Column({ type: 'int', unique: true })
  @Field(() => Int)
  number: number;

  @Column()
  @Field(() => String)
  title: string;

  @Column({
    type: 'enum',
    enum: BoardCategory,
    default: BoardCategory.NOTICE ,
  })
  @Field(() => BoardCategory)
  category: BoardCategory;

  @Column()
  @Field(() => String)
  content: string;

  @Column({ nullable: true })
  @Field(() =>String, { nullable: true })
  imageUrl: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'userId' })
  @Field(() => User)
  user: User;

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}