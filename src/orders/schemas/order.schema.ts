import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import mongoose, { HydratedDocument } from 'mongoose';
import { OrderItem, OrderItemSchema } from './order-item.schema';
import {
  ShippingAddress,
  ShippingAddressSchema,
} from './shipping-address.schema';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  @ApiProperty({ description: 'User ID who placed the order' })
  userId: string;

  @Prop({ required: true, unique: true })
  @ApiProperty({
    description: 'Unique order number',
    example: 'ORD-20241224-001',
  })
  orderNumber: string;

  @Prop({ required: true, type: [OrderItemSchema] })
  @ApiProperty({ description: 'Items in the order', type: [OrderItem] })
  items: OrderItem[];

  @Prop({ required: true, min: 0 })
  @ApiProperty({ description: 'Total order amount', example: 299.99 })
  totalAmount: number;

  @Prop({
    required: true,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING,
  })
  @ApiProperty({ description: 'Order status', enum: OrderStatus })
  status: OrderStatus;

  @Prop({ required: true, type: ShippingAddressSchema })
  @ApiProperty({ description: 'Shipping address', type: ShippingAddress })
  shippingAddress: ShippingAddress;

  @ApiProperty({ description: 'Order creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Order last update date' })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
