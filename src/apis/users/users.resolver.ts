// users.resolver.ts

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UpdateUsersBatchInput } from './dto/update-users-batch.input';
import { CreateUsersBatchInput } from './dto/create-users-batch.input';
import { CurrentUser } from 'src/commons/decorators/current-user.decorator';
import { IAuthUser } from 'src/commons/types/auth-user.type';
import { Public } from 'src/commons/decorators/public.decorator';


@Resolver()
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService, //
  ) {}
  @Query(() => User)
  fetchLoginUser(@CurrentUser() user: IAuthUser): Promise<User> {
    return this.usersService.findOneById({ id: user.id });
  }

  @Query(() => [User])
  async fetchAllUsers(): Promise<User[]> {
    return this.usersService.findAll({});
  }

  @Query(() => User)
  async fetchUser(@Args('userId') userId: string): Promise<User> {
    const user = await this.usersService.findOneById({ id: userId });
    if (!user) {
      throw new NotFoundException('해당 유저를 찾을 수 없습니다.');
    }
    return user;
  }

  @Public()
  @Mutation(() => User)
  async createUser(
    @Args('createUserInput') createUserInput: CreateUserInput,
  ): Promise<User> {
    return this.usersService.create({ createUserInput });
  }

  @Mutation(() => User)
  async updateUser(
    @Args('userId') userId: string,
    @Args('updateUserInput') updateUserInput: UpdateUserInput,
    @CurrentUser() currentUser: IAuthUser,
  ): Promise<User> {
    // 운영진은 다른 유저도 수정 가능, 일반 유저는 본인만 수정 가능
    const currentUserEntity = await this.usersService.findOneById({ id: currentUser.id });
    if (currentUserEntity?.role !== 'ADMIN' && currentUser.id !== userId) {
      throw new UnauthorizedException('본인만 수정할 수 있습니다.');
    }
    return this.usersService.update({ userId, updateUserInput });
  }

  @Mutation(() => String)
  async deleteUser(
    @Args('userId') userId: string,
    @CurrentUser() currentUser: IAuthUser,
  ): Promise<string> {
    // 운영진은 다른 유저도 삭제 가능, 일반 유저는 본인만 삭제 가능
    const currentUserEntity = await this.usersService.findOneById({ id: currentUser.id });
    if (currentUserEntity?.role !== 'ADMIN' && currentUser.id !== userId) {
      throw new UnauthorizedException('본인만 탈퇴할 수 있습니다.');
    }
    return this.usersService.delete({ userId });
  }

  @Mutation(() => [User])
  async updateUsers(
    @Args('updates') updates: UpdateUsersBatchInput,
    @CurrentUser() currentUser: IAuthUser,
  ): Promise<User[]> {
    // 운영진만 허용
    const currentUserEntity = await this.usersService.findOneById({ id: currentUser.id });
    if (currentUserEntity?.role !== 'ADMIN') {
      throw new UnauthorizedException('운영진만 여러 유저를 수정할 수 있습니다.');
    }
    
    return this.usersService.updateBatch({ updates: updates.updates });
  }

  @Mutation(() => [User])
  async createUsers(
    @Args('users') users: CreateUsersBatchInput,
    @CurrentUser() currentUser: IAuthUser,
  ): Promise<User[]> {
    // 운영진만 허용
    const currentUserEntity = await this.usersService.findOneById({ id: currentUser.id });
    if (currentUserEntity?.role !== 'ADMIN') {
      throw new UnauthorizedException('운영진만 여러 유저를 생성할 수 있습니다.');
    }
    
    return this.usersService.createBatch({ createUserInputs: users.users });
  }






}
