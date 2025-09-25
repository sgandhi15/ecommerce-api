import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderCreatedEvent } from './events/order-created.event';
import { RequestResponseService } from '../events/request-response.service';
import {
  UserLookupRequestEvent,
  UserLookupResponseEvent,
} from '../users/events/user-lookup.event';
import {
  CartLookupRequestEvent,
  CartLookupResponseEvent,
  CartClearRequestEvent,
} from '../carts/events/cart.events';
import {
  StockValidationRequestEvent,
  StockValidationResponseEvent,
} from '../products/events/product.events';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly eventEmitter: EventEmitter2,
    private readonly requestResponseService: RequestResponseService,
  ) {}

  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${year}${month}${day}-${timestamp}`;
  }

  private async supportsTransactions(): Promise<boolean> {
    try {
      if (!this.connection.db) {
        return false;
      }
      const admin = this.connection.db.admin();
      const result = await admin.replSetGetStatus();
      return !!result;
    } catch (error) {
      return false;
    }
  }

  private async executeWithTransaction<T>(
    operation: (session?: any) => Promise<T>,
  ): Promise<T> {
    const transactionsSupported = await this.supportsTransactions();

    if (transactionsSupported) {
      const session = await this.connection.startSession();
      try {
        return await session.withTransaction(() => operation(session));
      } finally {
        await session.endSession();
      }
    } else {
      return await operation();
    }
  }

  async createOrder(
    userEmail: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderDocument> {
    if (!createOrderDto || !createOrderDto.shippingAddress) {
      throw new BadRequestException('Shipping address is required');
    }

    return await this.executeWithTransaction(async (session) => {
      // Get user and cart via events
      const [cartResponse, userResponse] = await Promise.all([
        this.requestResponseService.sendRequest<CartLookupResponseEvent>(
          new CartLookupRequestEvent(userEmail, ''),
          'cart.lookup.response',
        ),
        this.requestResponseService.sendRequest<UserLookupResponseEvent>(
          new UserLookupRequestEvent(userEmail, ''),
          'user.lookup.response',
        ),
      ]);

      if (!cartResponse.cart) {
        throw new BadRequestException('Cart not found');
      }

      if (!userResponse.user) {
        throw new BadRequestException('User not found');
      }

      const cart = cartResponse.cart;
      const user = userResponse.user;

      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // Validate stock via events
      const stockValidationResponse =
        await this.requestResponseService.sendRequest<StockValidationResponseEvent>(
          new StockValidationRequestEvent(
            cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
            '',
          ),
          'stock.validation.response',
        );

      if (!stockValidationResponse.allValid) {
        const errors = stockValidationResponse.validationResults
          .filter((result) => !result.isValid)
          .map((result) => result.error)
          .join(', ');
        throw new BadRequestException(`Stock validation failed: ${errors}`);
      }

      const orderNumber = this.generateOrderNumber();

      const order = new this.orderModel({
        userId: user._id,
        orderNumber,
        items: cart.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        totalAmount: cart.totalAmount,
        status: OrderStatus.PENDING,
        shippingAddress: createOrderDto.shippingAddress,
      });

      const savedOrder = session
        ? await order.save({ session })
        : await order.save();

      // Clear cart via events
      await this.requestResponseService.sendRequest(
        new CartClearRequestEvent(userEmail, ''),
        'cart.clear.response',
      );

      this.eventEmitter.emit(
        'order.created',
        new OrderCreatedEvent(
          savedOrder._id.toString(),
          userEmail,
          orderNumber,
          cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          cart.totalAmount,
        ),
      );

      return savedOrder;
    });
  }

  async getUserOrders(
    userEmail: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    orders: OrderDocument[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalOrders: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      limit: number;
    };
  }> {
    const skip = (page - 1) * limit;

    // Get user via events
    const userResponse =
      await this.requestResponseService.sendRequest<UserLookupResponseEvent>(
        new UserLookupRequestEvent(userEmail, ''),
        'user.lookup.response',
      );

    if (!userResponse.user) {
      throw new NotFoundException('User not found');
    }

    const [orders, totalOrders] = await Promise.all([
      this.orderModel
        .find({ userId: userResponse.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ userId: userResponse.user._id }).exec(),
    ]);

    const totalPages = Math.ceil(totalOrders / limit);

    return {
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalOrders,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
    };
  }

  async getOrderById(
    orderId: string,
    userEmail: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Get user via events
    const userResponse =
      await this.requestResponseService.sendRequest<UserLookupResponseEvent>(
        new UserLookupRequestEvent(userEmail, ''),
        'user.lookup.response',
      );

    if (!userResponse.user) {
      throw new NotFoundException('User not found');
    }

    const orderUserIdStr = order.userId.toString();
    const userIdStr = userResponse.user._id.toString();

    if (orderUserIdStr !== userIdStr) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }
}
