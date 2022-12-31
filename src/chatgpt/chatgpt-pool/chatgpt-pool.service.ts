import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatGPTAPIBrowser, SendMessageOptions } from 'chatgpt';
import type { ChatgptConfig } from 'src/configs/config.interface';
import retry from 'async-retry';
@Injectable()
export class ChatgptPoolService {
  chatgptConfig: ChatgptConfig;
  chatgptPool: Map<string, ChatGPTAPIBrowser> = new Map();
  // Record the conversation between user email
  logger = new Logger('ChatgptPoolService');
  constructor(private configService: ConfigService) {
    this.chatgptConfig = this.configService.get<ChatgptConfig>('chatgpt');
  }
  // Create new Chatgpt instance
  async initChatGPTInstance(opts: {
    email: string;
    password: string;
    debug?: boolean;
    isGoogleLogin?: boolean;
    isMicrosoftLogin?: boolean;
  }) {
    const { ChatGPTAPIBrowser } = await import('chatgpt');
    const chatgpt = retry(
      async (_: any, num: number) => {
        const chatgpt = new ChatGPTAPIBrowser({
          ...opts,
          ...this.chatgptConfig,
        });
        try {
          return await chatgpt.initSession();
        } catch (e) {
          this.logger.error(
            `ChatGPT ${opts.email} initSession error: ${e.message}, retry ${num} times`
          );
          this.logger.debug(e.stack);
          throw e;
        }
      },
      {
        retries: 3,
      }
    );
    return chatgpt;
  }
  get accounts() {
    return this.chatgptPool.keys();
  }
  get poolIsEmpty() {
    return this.chatgptPool.size === 0;
  }
  getChatGPTInstanceByEmail(email?: string) {
    if (!!email) {
      return;
    }
    return this.chatgptPool.get(email);
  }
  deleteChatGPTInstanceByEmail(email: string) {
    return this.chatgptPool.delete(email);
  }
  refreshChatGPTInstanceByEmail(email: string) {
    const chatgpt = this.chatgptPool.get(email);
    if (chatgpt) {
      chatgpt.refreshSession();
    }
  }
  async sendMessage(
    message: string,
    options?: SendMessageOptions & { email?: string }
  ) {
    const chatGPT = this.getChatGPTInstanceByEmail(options.email);
    if (!chatGPT) {
      throw new Error('ChatGPT instance not found');
    }
    const response = await chatGPT.sendMessage(message, options);
    return response;
  }
}