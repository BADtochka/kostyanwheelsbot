import { UserEntity } from '@/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiService } from './api.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [ApiService],
  exports: [ApiService],
})
export class ApiModule {}
