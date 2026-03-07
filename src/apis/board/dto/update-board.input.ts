import { InputType, PartialType } from '@nestjs/graphql';
import { CreateBoardInput } from './create-board.input';

@InputType()
export class UpdateBoardInput extends PartialType(CreateBoardInput) {}
