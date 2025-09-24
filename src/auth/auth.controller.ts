import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from './auth.guard';

export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({ type: LoginDto })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.signIn(loginDto.email, loginDto.password);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get profile' })
  @Get('profile')
  async profile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }
}
