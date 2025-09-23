import { ApiProperty } from '@nestjs/swagger';
import { Item } from '../schemas/item.schema';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsDate,
} from 'class-validator';

export class CartResponseDto {
  @ApiProperty({
    description: 'The user ID who owns the cart',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'The items in the cart',
    type: [Item],
  })
  @IsArray()
  items: Item[];

  @ApiProperty({
    description: 'The total amount of the cart',
    example: 299.99,
  })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({
    description: 'Cart creation date',
  })
  @IsDate()
  @IsNotEmpty()
  createdAt: Date;

  @ApiProperty({
    description: 'Cart last update date',
  })
  @IsDate()
  @IsNotEmpty()
  updatedAt: Date;
}
