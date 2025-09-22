import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../schemas/user.schema';

export class CreateUserDto {
  @ApiProperty({
    description: 'The name of the user',
    minLength: 3,
    maxLength: 20,
  })
  name: string;

  @ApiProperty({
    description: 'The email of the user',
    format: 'email',
  })
  email: string;

  @ApiProperty({
    description: 'The password of the user',
    minLength: 8,
    maxLength: 20,
    format: 'password',
  })
  password: string;

  @ApiProperty({
    description: 'The role of the user',
    enum: UserRole,
  })
  role?: UserRole;
}
