import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import mongoose, { HydratedDocument } from 'mongoose';

export type OrderItemDocument = HydratedDocument<OrderItem>;

@Schema()
export class OrderItem {
  @Prop({
    required: true,
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
  })
  @ApiProperty({
    description: 'Product ID reference',
    example: '507f1f77bcf86cd799439011',
  })
  productId: string;

  @Prop({ required: true })
  @ApiProperty({
    description: 'Product name at time of order',
    example: 'iPhone 15 Pro',
  })
  productName: string;

  @Prop({ required: true, min: 1 })
  @ApiProperty({ description: 'Quantity ordered', example: 2 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  @ApiProperty({ description: 'Unit price at time of order', example: 999.99 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  @ApiProperty({ description: 'Total price for this item', example: 1999.98 })
  totalPrice: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);
