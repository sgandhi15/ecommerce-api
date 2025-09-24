import { ApiProperty } from '@nestjs/swagger';
import { OrderItem } from '../schemas/order-item.schema';
import { ShippingAddress } from '../schemas/shipping-address.schema';
import { OrderStatus, PaymentStatus } from '../schemas/order.schema';

export class OrderResponseDto {
  @ApiProperty({ description: 'Order ID', example: '507f1f77bcf86cd799439011' })
  _id: string;

  @ApiProperty({ description: 'User ID who placed the order' })
  userId: string;

  @ApiProperty({
    description: 'Unique order number',
    example: 'ORD-20241224-001',
  })
  orderNumber: string;

  @ApiProperty({ description: 'Items in the order', type: [OrderItem] })
  items: OrderItem[];

  @ApiProperty({ description: 'Total order amount', example: 299.99 })
  totalAmount: number;

  @ApiProperty({ description: 'Order status', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiProperty({ description: 'Shipping address', type: ShippingAddress })
  shippingAddress: ShippingAddress;

  @ApiProperty({ description: 'Order creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Order last update date' })
  updatedAt: Date;
}

export class OrderListResponseDto {
  @ApiProperty({ description: 'List of orders', type: [OrderResponseDto] })
  orders: OrderResponseDto[];

  @ApiProperty({
    description: 'Pagination information',
    example: {
      currentPage: 1,
      totalPages: 5,
      totalOrders: 42,
      hasNextPage: true,
      hasPreviousPage: false,
      limit: 10,
    },
  })
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    limit: number;
  };
}
