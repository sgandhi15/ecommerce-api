import { ApiProperty } from '@nestjs/swagger';
import { Cart } from '../schemas/cart.schema';

export class CartResponseDto {
  @ApiProperty({
    description: 'The cart',
    type: Cart,
  })
  cart: Cart;
}
