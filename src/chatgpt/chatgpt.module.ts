import { Module } from '@nestjs/common';
import { ChatgptService } from './chatgpt.service';
import { ChatgptController } from './chatgpt.controller';

@Module({
  providers: [ChatgptService],
  controllers: [ChatgptController],
})
export class ChatgptModule {}
