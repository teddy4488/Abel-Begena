import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ProductService } from './product.service';
import { Product } from './schemas/product.schema';
import { UploadService } from '../upload/upload.service';

describe('ProductService', () => {
  let service: ProductService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: getModelToken(Product.name),
          useValue: {
            find: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: UploadService,
          useValue: {
            uploadMaterial: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
