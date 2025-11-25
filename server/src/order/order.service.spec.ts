import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { Order } from './schemas/order.schema';
import { ProductService } from '../product/product.service';

describe('OrderService', () => {
  let service: OrderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getModelToken(Order.name),
          useValue: {
            find: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            findByIdAndUpdate: jest.fn(),
          },
        },
        {
          provide: ProductService,
          useValue: {
            findById: jest.fn(),
            reduceStock: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
