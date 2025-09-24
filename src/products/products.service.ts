import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { OnEvent } from '@nestjs/event-emitter';
import { HydratedDocument, Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { OrderCreatedEvent } from '../orders/events/order-created.event';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }

  async findAll(
    page: number,
    limit: number,
  ): Promise<{
    products: Product[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalProducts: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      limit: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const [products, totalProducts] = await Promise.all([
      this.productModel.find().skip(skip).limit(limit).exec(),
      this.productModel.countDocuments().exec(),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);

    return {
      products,
      pagination: {
        currentPage: page,
        totalPages,
        totalProducts,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        limit,
      },
    };
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async getProductCount(): Promise<number> {
    return this.productModel.countDocuments().exec();
  }

  async delete(id: string): Promise<void> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.productModel.findByIdAndDelete(id).exec();
  }

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Processing order ${event.orderNumber} for stock updates`);

    try {
      for (const item of event.items) {
        const product = await this.productModel.findById(item.productId);

        if (product) {
          if (product.stock >= item.quantity) {
            product.stock -= item.quantity;
            await product.save();

            this.logger.log(
              `Updated stock for product ${item.productId}: ${product.stock + item.quantity} -> ${product.stock}`,
            );
          } else {
            this.logger.error(
              `Insufficient stock for product ${item.productId}. Available: ${product.stock}, Required: ${item.quantity}`,
            );
          }
        } else {
          this.logger.error(
            `Product ${item.productId} not found during stock update`,
          );
        }
      }

      this.logger.log(`Stock updates completed for order ${event.orderNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to update stock for order ${event.orderNumber}:`,
        error,
      );
    }
  }
}
