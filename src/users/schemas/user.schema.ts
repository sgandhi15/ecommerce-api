import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({ required: true })
  @ApiProperty({
    description: 'The name of the user',
    minLength: 3,
    maxLength: 20,
  })
  name: string;

  @Prop({ required: true })
  @ApiProperty({
    description: 'The email of the user',
    format: 'email',
  })
  email: string;

  @Prop({ required: true })
  @ApiProperty({
    description: 'The password of the user',
    minLength: 8,
    maxLength: 20,
    format: 'password',
  })
  password: string;

  @Prop({
    required: true,
    default: UserRole.USER,
    enum: Object.values(UserRole),
  })
  @ApiProperty({
    description: 'The role of the user',
    enum: UserRole,
  })
  role: UserRole;
}

export const UserSchema = SchemaFactory.createForClass(User);
