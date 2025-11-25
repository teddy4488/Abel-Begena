import { Test, TestingModule } from '@nestjs/testing';
import { ClassService } from './class.service';
import { getModelToken } from '@nestjs/mongoose';
import { Class } from './schemas/class.schema';
import { ConfigService } from '@nestjs/config';
import { UploadService } from '../upload/upload.service';

describe('ClassService', () => {
  let service: ClassService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassService,
        {
          provide: getModelToken(Class.name),
          useValue: {
            find: jest.fn().mockReturnThis(),
            lean: jest.fn().mockReturnThis(),
            exec: jest.fn(),
            findById: jest.fn().mockReturnThis(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
        {
          provide: UploadService,
          useValue: { uploadMaterial: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ClassService>(ClassService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
