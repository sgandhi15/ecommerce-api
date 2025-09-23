import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Item } from 'src/carts/schemas/item.schema';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

@Schema()
export class Order {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  items: Item[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true })
  status: OrderStatus;

  @Prop({ required: true })
  shippingAddress: string;

  @Prop({ required: true })
  createdAt: Date;

  @Prop({ required: true })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
