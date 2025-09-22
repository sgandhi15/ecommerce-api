import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  BadRequestException,
  Put,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { Types } from 'mongoose';
import { UpdateUserDto } from './dtos/update-user.dto';
import { GetUserByEmailDto } from './dtos/get-users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('count')
  getUserCount() {
    return this.usersService.getUserCount();
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: GetUserByEmailDto) {
    return this.usersService.findByEmail(email.email);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }
    return this.usersService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user ID format');
    }
    return this.usersService.delete(id);
  }
}
