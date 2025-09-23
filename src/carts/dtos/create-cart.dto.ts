import { ApiProperty } from '@nestjs/swagger';
import { Item } from '../schemas/item.schema';

export class CartResponseDto {
  @ApiProperty({
    description: 'The cart ID',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'The user ID who owns the cart',
    example: '507f1f77bcf86cd799439011',
  })
  userId: string;

  @ApiProperty({
    description: 'The items in the cart',
    type: [Item],
  })
  items: Item[];

  @ApiProperty({
    description: 'The total amount of the cart',
    example: 299.99,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Cart creation date',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Cart last update date',
  })
  updatedAt: Date;
}
