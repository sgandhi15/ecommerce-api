import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dtos/add-to-cart.dto';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class CartsService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private productsService: ProductsService,
    private usersService: UsersService,
  ) {}

  async getUserCart(userEmail: string): Promise<CartDocument> {
    const user = await this.usersService.findByEmail(userEmail);

    let cart = await this.cartModel.findOne({ userId: user._id }).exec();

    if (!cart) {
      cart = new this.cartModel({
        userId: user._id,
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

    const product = await this.productsService.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

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

    const product = await this.productsService.findById(productId);
    if (product.stock < quantity) {
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
}
