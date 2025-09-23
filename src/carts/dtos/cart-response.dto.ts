import { ApiProperty } from '@nestjs/swagger';
import { Cart } from '../schemas/cart.schema';
import { IsNotEmpty } from 'class-validator';

export class CartResponseDto {
  @ApiProperty({
    description: 'The cart',
    type: Cart,
  })
  @IsNotEmpty()
  cart: Cart;
}
