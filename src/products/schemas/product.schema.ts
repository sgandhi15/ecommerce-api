import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { IsPositive, MaxLength } from 'class-validator';
import { IsBase64Image } from './is-base64-image.validator';

export type ProductDocument = HydratedDocument<Product>;

@Schema()
export class Product {
  @Prop({ required: true })
  @MaxLength(64)
  name: string;

  @Prop({ required: true })
  @MaxLength(2048)
  description: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  @IsPositive()
  stock: number;

  @Prop({ required: true })
  @IsBase64Image()
  image: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
