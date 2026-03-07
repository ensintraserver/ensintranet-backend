import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Board } from './entities/board.entity';
import { BoardResolver } from './board.resolver';
import { BoardService } from './board.service';
import { User } from 'src/apis/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Board, User])],
  providers: [BoardResolver, BoardService],
  exports: [BoardService],
})
export class BoardModule {}
