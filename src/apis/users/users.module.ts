// users.module.ts

import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserMajor } from 'src/apis/user-major/entities/user-major.entity';
import { Career } from 'src/apis/career/entities/career.entity';
import { UsersResolver } from './users.resolver';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { MajorModule } from '../major/major.module';
import { IndustryModule } from '../industry/industry.module';
import { PositionCategoryModule } from '../positionCategory/positionCategory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserMajor, Career]),
    MajorModule,
    IndustryModule,
    PositionCategoryModule,
  ],
  providers: [
    UsersResolver, //
    UsersService,
  ],

  exports: [
    UsersService, // 이렇게 해주면 UsersService가 UsersMoudle에 담겨서 나간다 -> 그걸 auth에서 사용할 수 있게 되는거임
    // 레파지토리는 따로 안해줘도 되는데, 모듈을 통해 export하면 내장되어서 같이 나간다
  ],
})
export class UsersModule {}
