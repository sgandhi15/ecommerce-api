import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsPositive,
  IsNumber,
  Min,
} from 'class-validator';
import { Types } from 'mongoose';

export class AddToCartDto {
  @ApiProperty({
    description: 'The product ID to add to cart',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  productId: string;

  @ApiProperty({
    description: 'The quantity of the product',
    example: 2,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;
}
