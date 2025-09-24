import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  UnauthorizedException,
  Query,
  Get,
  Put,
  Param,
  Delete,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateProductDto } from './dtos/create-product.dto';
import { ProductsService } from './products.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { ApiBody, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { AuthenticatedRequest } from 'src/auth/auth.controller';
import { UserRole } from 'src/users/schemas/user.schema';
import { UpdateProductDto } from './dtos/update-product.dto';
import { Types } from 'mongoose';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @ApiOperation({ summary: 'Create a product' })
  @ApiBody({ type: CreateProductDto })
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

  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);

    return this.productsService.findAll(pageNum, limitNum);
  }

  @ApiOperation({ summary: 'Get the number of products' })
  @Get('count')
  getProductCount() {
    return this.productsService.getProductCount();
  }

  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @ApiOperation({ summary: 'Update a product by ID' })
  @UseGuards(AuthGuard)
  @ApiParam({ name: 'id', description: 'Product ID' })
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const userRole = req.user.role;
    if (userRole !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'You are not authorized to update a product',
      );
    }

    return this.productsService.update(id, updateProductDto);
  }

  @ApiOperation({ summary: 'Delete a product by ID' })
  @UseGuards(AuthGuard)
  @ApiParam({ name: 'id', description: 'Product ID' })
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID format');
    }

    const product = await this.productsService.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const userRole = req.user.role;
    if (userRole !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'You are not authorized to delete a product',
      );
    }

    return this.productsService.delete(id);
  }
}
