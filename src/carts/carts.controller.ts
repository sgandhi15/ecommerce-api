import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { CartsService } from './carts.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UpdateCartItemDto } from './dtos/update-cart.dto';
import { CartResponseDto } from './dtos/create-cart.dto';
import type { AuthenticatedRequest } from 'src/auth/auth.controller';

@ApiTags('cart')
@UseGuards(AuthGuard)
@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @ApiOperation({ summary: 'Get current user cart' })
  @Get()
  async getUserCart(@Req() req: AuthenticatedRequest) {
    const userEmail = req.user.sub;
    const cart = await this.cartsService.getUserCart(userEmail);
    return cart.toObject();
  }

  @ApiOperation({ summary: 'Add product to cart' })
  @Post('items')
  async addItem(
    @Body() addToCartDto: AddToCartDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(addToCartDto.productId)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const cart = await this.cartsService.addItem(userId, addToCartDto);
    return cart.toObject();
  }

  @ApiOperation({ summary: 'Update product quantity in cart' })
  @Patch('items/:productId')
  async updateItemQuantity(
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const cart = await this.cartsService.updateItemQuantity(
      userId,
      productId,
      updateCartItemDto.quantity,
    );
    return cart.toObject();
  }

  @ApiOperation({ summary: 'Remove product from cart' })
  @Delete('items/:productId')
  async removeItem(
    @Param('productId') productId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user.sub;

    // Validate ObjectId format
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const cart = await this.cartsService.removeItem(userId, productId);
    return cart.toObject();
  }

  @ApiOperation({ summary: 'Clear cart' })
  @Delete()
  async clearCart(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const cart = await this.cartsService.clearCart(userId);
    return cart.toObject();
  }
}
