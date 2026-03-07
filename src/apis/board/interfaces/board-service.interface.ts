import { CreateBoardInput } from '../dto/create-board.input';
import { UpdateBoardInput } from '../dto/update-board.input';

export interface IBoardsServiceCreate {
  createBoardInput: CreateBoardInput;
  userId: string;
}

export interface IBoardsServiceUpdate {
  boardId: string;
  updateBoardInput: UpdateBoardInput;
}

export interface IBoardsServiceDelete {
  boardId: string;
}

export interface IBoardsServiceFindOne {
  id: string;
}

export interface IBoardsServiceFindAll {
  // 필요시 필터링 옵션 추가 가능
}
