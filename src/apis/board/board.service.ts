import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Board, BoardCategory } from './entities/board.entity';
import { User } from 'src/apis/users/entities/user.entity';
import {
  IBoardsServiceCreate,
  IBoardsServiceUpdate,
  IBoardsServiceDelete,
  IBoardsServiceFindOne,
  IBoardsServiceFindAll,
} from './interfaces/board-service.interface';

@Injectable()
export class BoardService {
  constructor(
    @InjectRepository(Board)
    private readonly boardRepository: Repository<Board>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create({ createBoardInput, userId }: IBoardsServiceCreate): Promise<Board> {
    const { title, category, content, imageUrl } = createBoardInput;

    // 유저 조회 (관계 필드 제외)
    const user = await this.usersRepository.findOne({ 
      where: { id: userId },
      select: ['id', 'name', 'customId', 'generation', 'entrance', 'email', 'phone', 'imageUrl', 'linkedin', 'noCoffeeChat', 'abroad', 'agreeTerms', 'agreePrivacy', 'agreeAge', 'memo', 'role', 'createdAt', 'updatedAt']
    });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // 가장 큰 number를 찾아서 +1
    const lastBoard = await this.boardRepository.findOne({
      where: {},
      order: { number: 'DESC' },
      withDeleted: true, // 삭제된 게시글도 포함하여 조회
    });

    const nextNumber = lastBoard ? lastBoard.number + 1 : 1;

    // Board 엔티티 생성 및 저장
    const board = await this.boardRepository.save({
      number: nextNumber,
      title,
      category: category ?? BoardCategory.NOTICE,
      content,
      imageUrl,
      user: { id: userId } as User, // userId만 사용하여 관계 설정
    });

    // 저장 후 user 관계를 포함하여 다시 조회
    return this.boardRepository.findOne({
      where: { id: board.id },
      relations: ['user'],
    });
  }

  async findAll({}: IBoardsServiceFindAll): Promise<Board[]> {
    return this.boardRepository.find({
      relations: ['user'],
      order: {
        createdAt: 'DESC', // 최신순 정렬
      },
    });
  }

  async findOne({ id }: IBoardsServiceFindOne): Promise<Board> {
    return this.boardRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async update({
    boardId,
    updateBoardInput,
  }: IBoardsServiceUpdate): Promise<Board> {
    const board = await this.findOne({ id: boardId });
    if (!board) {
      throw new NotFoundException('해당 게시글을 찾을 수 없습니다.');
    }

    const { title, category, content, imageUrl } = updateBoardInput;

    const updatedBoard = await this.boardRepository.save({
      ...board,
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category }),
      ...(content !== undefined && { content }),
      ...(imageUrl !== undefined && { imageUrl }),
    });

    return updatedBoard;
  }

  async delete({ boardId }: IBoardsServiceDelete): Promise<string> {
    const board = await this.findOne({ id: boardId });
    if (!board) {
      throw new NotFoundException('해당 게시글을 찾을 수 없습니다.');
    }

    const { affected } = await this.boardRepository.softDelete({ id: boardId });

    if (!affected) {
      throw new NotFoundException('게시글 삭제에 실패했습니다.');
    }

    return '게시글 삭제에 성공했습니다.';
  }
}
