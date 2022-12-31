import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  Put,
} from '@nestjs/common';
import { ChatgptService } from './chatgpt.service';

@Controller('chatgpt')
export class ChatgptController {
  constructor(private readonly chatgptService: ChatgptService) {}
  @Post('/account')
  async createChatgptAccount(@Body() createCatDto: any) {
    return this.chatgptService.createChatGPTAccount(createCatDto);
  }
  @Get('/account')
  async getChatgptAccount() {
    return await this.chatgptService.getAllChatGPT();
  }
  @Delete('/account/:email')
  async deleteChatgptAccount(@Param('email') id: string) {
    return await this.chatgptService.deleteChatGPTAccount(id);
  }
  @Put('/account/:email')
  async updateChatgptAccount(
    @Param('email') id: string,
    @Body() updateCatDto: any
  ) {
    return await this.chatgptService.updateChatGPTAccount(id, updateCatDto);
  }

  @Post('/account/:email/send')
  async sendChatgptMessage(
    @Param('email') email: string,
    @Body() messageDto: any
  ) {
    const { message, options } = await messageDto;
    return await this.chatgptService.sendChatGPTMessage(
      email,
      message,
      options
    );
  }
}
