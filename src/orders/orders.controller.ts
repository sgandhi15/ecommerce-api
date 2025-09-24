import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  Param,
  Get,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery, ApiBody } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CreateOrderDto } from './dtos/create-order.dto';
import {
  OrderResponseDto,
  OrderListResponseDto,
} from './dtos/order-response.dto';
import type { AuthenticatedRequest } from '../auth/auth.controller';
import { Types } from 'mongoose';

@ApiTags('orders')
@UseGuards(AuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Create a new order from cart' })
  @ApiBody({ type: CreateOrderDto })
  @Post()
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderResponseDto> {
    const userEmail = req.user.sub;
    const order = await this.ordersService.createOrder(
      userEmail,
      createOrderDto,
    );
    return order.toObject() as unknown as OrderResponseDto;
  }

  @ApiOperation({ summary: 'Get current user orders' })
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
  async getUserOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<OrderListResponseDto> {
    const userEmail = req.user.sub;
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const result = await this.ordersService.getUserOrders(
      userEmail,
      pageNum,
      limitNum,
    );

    return {
      orders: result.orders.map((order) =>
        order.toObject(),
      ) as unknown as OrderResponseDto[],
      pagination: result.pagination,
    };
  }

  @ApiOperation({ summary: 'Get order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @Get(':id')
  async getOrderById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<OrderResponseDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const userEmail = req.user.sub;
    const order = await this.ordersService.getOrderById(id, userEmail);
    return order.toObject() as unknown as OrderResponseDto;
  }
}
