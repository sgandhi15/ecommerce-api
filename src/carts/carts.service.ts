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

  // Get or create user's cart
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

  // Add item to cart
  async addItem(
    userId: string,
    addToCartDto: AddToCartDto,
  ): Promise<CartDocument> {
    const { productId, quantity } = addToCartDto;

    // Verify product exists and get its details
    const product = await this.productsService.findById(productId);
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    // Check stock availability (assuming product has a stock field)
    if (product.stock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${product.stock}`,
      );
    }

    const cart = await this.getUserCart(userId);

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (existingItemIndex > -1) {
      // Update existing item quantity
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
      // Add new item to cart
      cart.items.push({
        productId,
        productName: product.name,
        quantity,
        unitPrice: product.price,
        totalPrice: product.price * quantity,
      });
    }

    // Recalculate total
    cart.totalAmount = this.calculateTotal(cart.items);

    return await cart.save();
  }

  // Update item quantity in cart
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

    // Verify product exists and check stock
    const product = await this.productsService.findById(productId);
    if (product.stock < quantity) {
      throw new BadRequestException(`Insufficient stock`);
    }

    // Update item
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].totalPrice =
      cart.items[itemIndex].unitPrice * quantity;

    // Recalculate total
    cart.totalAmount = this.calculateTotal(cart.items);

    return await cart.save();
  }

  // Remove item from cart
  async removeItem(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.getUserCart(userId);

    const itemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException(`Product ${productId} not found in cart`);
    }

    // Remove item
    cart.items.splice(itemIndex, 1);

    // Recalculate total
    cart.totalAmount = this.calculateTotal(cart.items);

    return await cart.save();
  }

  // Clear entire cart
  async clearCart(userId: string): Promise<CartDocument> {
    const cart = await this.getUserCart(userId);
    cart.items = [];
    cart.totalAmount = 0;
    return await cart.save();
  }

  // Calculate cart total
  private calculateTotal(items: any[]): number {
    return items.reduce((total, item) => total + item.totalPrice, 0);
  }
}
