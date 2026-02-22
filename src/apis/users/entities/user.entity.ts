import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Career } from 'src/apis/career/entities/career.entity';
import { UserMajor } from 'src/apis/user-major/entities/user-major.entity';

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// 사용자 등급 Enum 정의
export enum UserRole {
  MEMBER = 'MEMBER',       // 학회원
  ADMIN = 'ADMIN',         // 운영진
}

// GraphQL에 Enum 등록
registerEnumType(UserRole, {
  name: 'UserRole',
  description: '사용자 등급',
});

@Entity()
@ObjectType()
export class User {
  @PrimaryGeneratedColumn('uuid')
  @Field(() => String)
  id: string;

  @Column()
  @Field(() => String)
  customId: string;

  @Column()
  // @Field(() => String)
  password: string;

  @Column()
  @Field(() => String)
  name: string;


  @Column()
  @Field(() => Int)
  generation: number;



  @Column()
  @Field(() => String)
  phone: string;

  @Column({ nullable: true })
  @Field(() =>String, { nullable: true })
  imageUrl: string;

  @Column()
  @Field(() => String)
  email: string;

  @Column()
  @Field(() => Int)
  entrance: number;

  @OneToMany(() => UserMajor, (userMajor) => userMajor.user)
  @Field(() => [UserMajor], { nullable: true }) // 문법 수정: 대괄호 위치 변경
  userMajors: UserMajor[];

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  linkedin: string;

  @Column({ default: false })
  @Field(() => Boolean)
  noCoffeeChat: boolean;

  @Column({ default: false })
  @Field(() => Boolean)
  abroad: boolean;

  @Column({ nullable: true })
  @Field(() => String, { nullable: true })
  memo: string; // 회원목록에서 메모 / 운영진 참고사항

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MEMBER,
  })
  @Field(() => UserRole)
  role: UserRole; // 학회원, 운영진

  @OneToMany(() => Career, (career) => career.user)
  @Field(() => [Career], { nullable: true }) // nullable 추가 (선택사항)
  careers: Career[];

  @CreateDateColumn()
  @Field(() => Date)
  createdAt: Date;

  @UpdateDateColumn()
  @Field(() => Date)
  updatedAt: Date;

  @DeleteDateColumn()
  @Field(() => Date)
  deletedAt: Date;
}
