// users.resolver.ts

import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
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
    @CurrentUser() user: IAuthUser,
  ): Promise<User> {
    if (user.id !== userId) {
      throw new UnauthorizedException('본인만 수정할 수 있습니다.');
    }
    return this.usersService.update({ userId, updateUserInput });
  }

  @Mutation(() => String)
  async deleteUser(
    @Args('userId') userId: string,
    @CurrentUser() user: IAuthUser,
  ): Promise<string> {
    if (user.id !== userId) {
      throw new UnauthorizedException('본인만 탈퇴할 수 있습니다.');
    }
    return this.usersService.delete({ userId });
  }






}
