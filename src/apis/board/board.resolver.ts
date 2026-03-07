import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Board } from './entities/board.entity';
import { BoardService } from './board.service';
import { CreateBoardInput } from './dto/create-board.input';
import { UpdateBoardInput } from './dto/update-board.input';
import { NotFoundException } from '@nestjs/common';
import { CurrentUser } from 'src/commons/decorators/current-user.decorator';
import { IAuthUser } from 'src/commons/interfaces/context';

@Resolver()
export class BoardResolver {
  constructor(
    private readonly boardService: BoardService,
  ) {}

  @Query(() => [Board])
  async fetchAllBoards(): Promise<Board[]> {
    return this.boardService.findAll({});
  }

  @Query(() => Board)
  async fetchBoard(@Args('boardId') boardId: string): Promise<Board> {
    const board = await this.boardService.findOne({ id: boardId });
    if (!board) {
      throw new NotFoundException('해당 게시글을 찾을 수 없습니다.');
    }
    return board;
  }

  @Mutation(() => Board)
  async createBoard(
    @Args('createBoardInput') createBoardInput: CreateBoardInput,
    @CurrentUser() currentUser: IAuthUser,
  ): Promise<Board> {
    if (!currentUser?.id) {
      throw new NotFoundException('로그인이 필요합니다.');
    }
    return this.boardService.create({ createBoardInput, userId: currentUser.id });
  }

  @Mutation(() => Board)
  async updateBoard(
    @Args('boardId') boardId: string,
    @Args('updateBoardInput') updateBoardInput: UpdateBoardInput,
  ): Promise<Board> {
    return this.boardService.update({ boardId, updateBoardInput });
  }

  @Mutation(() => String)
  async deleteBoard(@Args('boardId') boardId: string): Promise<string> {
    return this.boardService.delete({ boardId });
  }
}
