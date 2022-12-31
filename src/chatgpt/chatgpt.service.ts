import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import type { SendMessageOptions } from 'chatgpt';
import { PrismaService } from 'nestjs-prisma';
import { ChatgptPoolService } from './chatgpt-pool/chatgpt-pool.service';
import { Cron } from '@nestjs/schedule';
@Injectable()
export class ChatgptService {
  logger = new Logger('ChatgptService');
  constructor(
    private prismaService: PrismaService,
    private chatgptPoolService: ChatgptPoolService
  ) {
    (async () => {
      await this.stopAllChatGPTInstances();
      await this.startAllDownAccount();
    })();
  }

  async createChatGPTAccount(account: {
    email: string;
    password: string;
    isGoogleLogin?: boolean;
    isMicrosoftLogin?: boolean;
  }) {
    return this.prismaService.chatGPTAccount.create({
      data: account,
    });
  }
  async deleteChatGPTAccount(email: string) {
    this.chatgptPoolService.deleteChatGPTInstanceByEmail(email);
    return this.prismaService.chatGPTAccount.delete({
      where: { email },
    });
  }
  async updateChatGPTAccount(
    email: string,
    account: {
      email: string;
      password: string;
      isGoogleLogin?: boolean;
      isMicrosoftLogin?: boolean;
      // User can only stop the chatgpt account
      status?: 'Stopped';
    }
  ) {
    this.chatgptPoolService.deleteChatGPTInstanceByEmail(email);
    const chatgptAccount = await this.prismaService.chatGPTAccount.update({
      where: { email },
      data: { ...account, status: 'Down' },
    });
    if (account.status === 'Stopped') {
      return this.prismaService.chatGPTAccount.update({
        where: { email },
        data: { status: 'Stopped' },
      });
    }
    // TODO: add queue support
    this.chatgptPoolService.initChatGPTInstance(account);
    return chatgptAccount;
  }
  async getChatGPTAccount(email: string) {
    const chatGPTAccount = await this.prismaService.chatGPTAccount.findUnique({
      where: { email },
      select: {
        email: true,
        isGoogleLogin: true,
        isMicrosoftLogin: true,
        status: true,
      },
    });
    return chatGPTAccount;
  }
  async getAllChatGPT() {
    return this.prismaService.chatGPTAccount.findMany({
      select: {
        email: true,
        isGoogleLogin: true,
        isMicrosoftLogin: true,
        status: true,
      },
    });
  }
  async getCurrentActiveChatGPT() {
    return this.prismaService.chatGPTAccount.findMany({
      where: { status: 'Running' },
      select: {
        email: true,
      },
    });
  }
  async sendChatGPTMessage(message: string, options?: SendMessageOptions) {
    let email: string;
    const { conversationId, parentMessageId } = options || {};
    if (!conversationId || !parentMessageId) {
      const account = await this.getCurrentActiveChatGPT();
      email = account[Math.floor(Math.random() * account.length)].email;
    } else {
      const account = await this.prismaService.chatGPTConversation.findUnique({
        where: { id: conversationId },
        select: {
          email: true,
        },
      });
      if (!account) {
        throw new Error('Conversation not found');
      }
      email = account.email;
    }
    // Send Message
    this.logger.debug(`Send message to ${email}: ${message}`);
    const messageResult = await this.chatgptPoolService.sendMessage(message, {
      ...options,
      email: email,
    });
    if (messageResult) {
      await this.prismaService.chatGPTConversation.upsert({
        where: {
          conversationId: messageResult.conversationId,
        },
        create: {
          conversationId: messageResult.conversationId,
          messageId: messageResult.messageId,
          email,
        },
        update: {
          messageId: messageResult.messageId,
          conversationId: messageResult.conversationId,
        },
      });
      return messageResult;
    } else {
      this.logger.error(`Send message to ${email} failed`);
    }
  }
  async startChatgptInstance(email: string) {
    // As Lock
    const account = await this.prismaService.chatGPTAccount.findFirst({
      where: { AND: [{ email }, { status: 'Down' }] },
    });
    if (!account) {
      this.logger.error(`Account ${email} is not down`);
      return;
    }
    this.logger.debug(`Start account ${account.email}`);
    await this.prismaService.chatGPTAccount.update({
      where: { email: account.email },
      data: { status: 'Starting' },
    });
    try {
      await this.chatgptPoolService.initChatGPTInstance(account);
      await this.prismaService.chatGPTAccount.update({
        where: { email: account.email },
        data: { status: 'Running' },
      });
    } catch (err) {
      this.logger.error(`Error starting account ${account.email}: ${err}`);
      await this.prismaService.chatGPTAccount.update({
        where: { email: account.email },
        data: { status: 'Error' },
      });
    }
  }
  async stopAllChatGPTInstances() {
    this.logger.debug('Stop all chatgpt instances');
    const accounts = await this.prismaService.chatGPTAccount.findMany({
      where: {
        OR: [
          { status: 'Running' },
          {
            status: 'Starting',
          },
          {
            status: 'Error',
          },
        ],
      },
      select: {
        email: true,
      },
    });
    console.log(`Found ${accounts.length} running accounts`);
    for (const account of accounts) {
      this.chatgptPoolService.deleteChatGPTInstanceByEmail(account.email);
      await this.prismaService.chatGPTAccount.update({
        where: { email: account.email },
        data: { status: 'Down' },
      });
    }
    this.logger.debug(`Found ${accounts.length} running accounts`);
  }
  @Cron('1 * * * * *')
  async startAllDownAccount() {
    this.logger.debug('Start all down account');
    const accounts = await this.prismaService.chatGPTAccount.findMany({
      where: { status: 'Down' },
      select: {
        email: true,
      },
      take: 1,
    });
    this.logger.debug(`Found ${accounts.length} down accounts`);
    for (const account of accounts) {
      await this.startChatgptInstance(account.email);
    }
  }
}
