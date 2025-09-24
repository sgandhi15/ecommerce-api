import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CartsService } from '../carts/carts.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dtos/create-order.dto';
import { OrderCreatedEvent } from './events/order-created.event';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly cartsService: CartsService,
    private readonly productsService: ProductsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly usersService: UsersService,
  ) {}

  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `ORD-${year}${month}${day}-${timestamp}`;
  }

  // Check if MongoDB instance supports transactions
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
      console.log('[INFO] Running without transactions (standalone MongoDB)');
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
      // Get user's cart and user details
      const [cart, user] = await Promise.all([
        this.cartsService.getUserCart(userEmail),
        this.usersService.findByEmailWithId(userEmail),
      ]);

      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // Validate all products exist and have sufficient stock
      await this.validateCartAndStock(cart.items);

      // Create order document
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

      // Save order with session if available
      const savedOrder = session
        ? await order.save({ session })
        : await order.save();

      console.log(
        `[INFO] Order created: ${savedOrder._id} for user: ${userEmail}`,
      );

      // Clear user's cart
      await this.cartsService.clearCart(userEmail);

      // Emit order created event for stock management
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

  private async validateCartAndStock(cartItems: any[]): Promise<void> {
    for (const item of cartItems) {
      const product = await this.productsService.findById(item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
        );
      }
    }
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

    const user = await this.usersService.findByEmailWithId(userEmail);
    console.log(
      `[DEBUG] Getting orders for user: ${userEmail} (ID: ${user._id})`,
    );

    const [orders, totalOrders] = await Promise.all([
      this.orderModel
        .find({ userId: user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments({ userId: user._id }).exec(),
    ]);

    console.log(
      `[DEBUG] Found ${totalOrders} total orders for user, returning ${orders.length} orders`,
    );

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
    console.log(
      `[DEBUG] Looking for order ID: ${orderId} for user: ${userEmail}`,
    );

    const order = await this.orderModel.findById(orderId).exec();

    if (!order) {
      console.log(`[DEBUG] Order not found in database: ${orderId}`);
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    console.log(
      `[DEBUG] Found order with userId: ${order.userId} (type: ${typeof order.userId})`,
    );

    // Ensure user can only access their own orders
    const user = await this.usersService.findByEmailWithId(userEmail);
    console.log(`[DEBUG] User _id: ${user._id} (type: ${typeof user._id})`);

    // Convert both to strings for proper comparison
    const orderUserIdStr = order.userId.toString();
    const userIdStr = user._id.toString();
    console.log(
      `[DEBUG] Comparing orderUserId: "${orderUserIdStr}" with userId: "${userIdStr}"`,
    );

    if (orderUserIdStr !== userIdStr) {
      console.log(
        `[DEBUG] User authorization failed - order belongs to different user`,
      );
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    console.log(`[DEBUG] Order access authorized for user: ${userEmail}`);
    return order;
  }
}
