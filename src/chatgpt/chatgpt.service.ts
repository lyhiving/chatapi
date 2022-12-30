import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatGPTAPIBrowser } from 'chatgpt';
import type { ChatgptConfig } from 'src/configs/config.interface';
@Injectable()
export class ChatgptService {
  chatgptConfig: ChatgptConfig;
  chatgptPool: Map<string, ChatGPTAPIBrowser> = new Map();
  constructor(configService: ConfigService) {
    this.chatgptConfig = configService.get<ChatgptConfig>('chatgpt');
  }
  async getChatGPT(opts: {
    email: string;
    password: string;
    markdown?: boolean;
    debug?: boolean;
    isGoogleLogin?: boolean;
    isMicrosoftLogin?: boolean;
  }) {
    const { ChatGPTAPIBrowser } = await import('chatgpt');
    const chatgpt = new ChatGPTAPIBrowser({ ...opts, ...this.chatgptConfig });
    await chatgpt.initSession();
    return chatgpt;
  }
}
