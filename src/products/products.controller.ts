import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateProductDto } from './dtos/create-product.dto';
import { ProductsService } from './products.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiOperation } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'src/auth/auth.controller';
import { UserRole } from 'src/users/schemas/user.schema';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Create a product' })
  @UseGuards(AuthGuard)
  @Post()
  create(
    @Body() createProductDto: CreateProductDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userRole = req.user.role;

    if (userRole !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'You are not authorized to create a product',
      );
    }

    return this.productsService.create(createProductDto);
  }
}
