import { Test, TestingModule } from '@nestjs/testing';
import { UserWorkerService } from './user.service.js';

describe('UserService', () => {
  let service: UserWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserWorkerService],
    }).compile();

    service = module.get<UserWorkerService>(UserWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
