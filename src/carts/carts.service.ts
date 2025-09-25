import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import {
  CartLookupRequestEvent,
  CartLookupResponseEvent,
  CartClearRequestEvent,
  CartClearResponseEvent,
} from './events/cart.events';
import { RequestResponseService } from '../events/request-response.service';
import {
  UserLookupRequestEvent,
  UserLookupResponseEvent,
} from '../users/events/user-lookup.event';
import {
  ProductLookupRequestEvent,
  ProductLookupResponseEvent,
} from '../products/events/product.events';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private requestResponseService: RequestResponseService,
  ) {}

  async getUserCart(userEmail: string): Promise<CartDocument> {
    // Get user via events
    const userResponse =
      await this.requestResponseService.sendRequest<UserLookupResponseEvent>(
        new UserLookupRequestEvent(userEmail, ''),
        'user.lookup.response',
      );

    if (!userResponse.user) {
      throw new NotFoundException('User not found');
    }

    let cart = await this.cartModel
      .findOne({ userId: userResponse.user._id })
      .exec();

    if (!cart) {
      cart = new this.cartModel({
        userId: userResponse.user!._id,
        items: [],
        totalAmount: 0,
      });
      await cart.save();
    }

    return cart;
  }

  async addItem(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<CartDocument> {
    const { productId, quantity } = addToCartDto;

    // Get product via events
    const productResponse =
      await this.requestResponseService.sendRequest<ProductLookupResponseEvent>(
        new ProductLookupRequestEvent(productId, ''),
        'product.lookup.response',
      );

    if (!productResponse.product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const product = productResponse.product;

    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    const cart = await this.getUserCart(userId);

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (existingItemIndex > -1) {
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;

      if (product.stock < newQuantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${product.stock}`,
        );
      }

      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].totalPrice =
        cart.items[existingItemIndex].unitPrice * newQuantity;
    } else {
      cart.items.push({
        productId,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity,
      });
    }

    cart.totalAmount = this.calculateTotal(cart.items);

    return await cart.save();
  }

  async updateItemQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartDocument> {
    const cart = await this.getUserCart(userId);

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException(`Product ${productId} not found in cart`);
    }

    // Get product via events
    const productResponse =
      await this.requestResponseService.sendRequest<ProductLookupResponseEvent>(
        new ProductLookupRequestEvent(productId, ''),
        'product.lookup.response',
      );

    if (!productResponse.product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    if (productResponse.product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock`);
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].totalPrice =
      cart.items[itemIndex].unitPrice * quantity;

    cart.totalAmount = this.calculateTotal(cart.items);

    return await cart.save();
  }

  async removeItem(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.getUserCart(userId);

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException(`Product ${productId} not found in cart`);
    }

    cart.items.splice(itemIndex, 1);

    cart.totalAmount = this.calculateTotal(cart.items);

    return await cart.save();
  }

  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.getUserCart(userId);
    cart.items = [];
    cart.totalAmount = 0;
    return await cart.save();
  }

  private calculateTotal(items: any[]): number {
    return items.reduce((total, item) => total + item.totalPrice, 0);
  }

  @OnEvent('cart.lookup.request')
  async handleCartLookupRequest(
    event: CartLookupRequestEvent & { requestId: string },
  ): Promise<void> {
    try {
      const cart = await this.getUserCart(event.userEmail);

      const response = new CartLookupResponseEvent(event.requestId, {
        userId: cart.userId.toString(),
        items: cart.items.map((item) => ({
          productId: item.productId.toString(),
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        })),
        totalAmount: cart.totalAmount,
      });

      this.requestResponseService.handleResponse(
        'cart.lookup.response',
        response,
      );
    } catch (error) {
      const response = new CartLookupResponseEvent(
        event.requestId,
        null,
        error.message,
      );

      this.requestResponseService.handleResponse(
        'cart.lookup.response',
        response,
      );
    }
  }

  @OnEvent('cart.clear.request')
  async handleCartClearRequest(
    event: CartClearRequestEvent & { requestId: string },
  ): Promise<void> {
    try {
      await this.clearCart(event.userEmail);

      const response = new CartClearResponseEvent(event.requestId, true);

      this.requestResponseService.handleResponse(
        'cart.clear.response',
        response,
      );
    } catch (error) {
      const response = new CartClearResponseEvent(
        event.requestId,
        false,
        error.message,
      );

      this.requestResponseService.handleResponse(
        'cart.clear.response',
        response,
      );
    }
  }
}
