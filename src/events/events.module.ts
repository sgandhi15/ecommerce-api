import { Module, Global } from '@nestjs/common';
import { RequestResponseService } from './request-response.service';

@Global()
@Module({
  providers: [RequestResponseService],
  exports: [RequestResponseService],
})
export class EventsModule {}
