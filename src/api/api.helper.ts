import { UserEntity } from '@/entities/user.entity';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiService } from './api.service';

@Injectable()
export class ApiHelper {
  public constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @Inject(forwardRef(() => ApiService))
    private apiService: ApiService,
  ) {}
  private logger = new Logger(ApiHelper.name);

  async initOwnerAccount() {
    const isExist = await this.userRepository.findOneBy({ username: 'BAD' });
    const botName = process.env.NODE_ENV === 'development' ? 'KostyanWheelsDevBot' : 'KostyanWheelsBot';
    if (isExist && !isExist.inviteCode) {
      const { code } = await this.apiService.addInviteCode(isExist);
      this.logger.log(`Owner invite code: https://t.me/${botName}?start=${code}`);
      return;
    }

    this.logger.log(`Owner invite code: https://t.me/${botName}?start=${isExist?.inviteCode}`);

    // TODO: add create account
  }
}
