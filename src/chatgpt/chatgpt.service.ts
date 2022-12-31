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
  async sendChatGPTMessage(
    email: string,
    message: string,
    options?: SendMessageOptions
  ) {
    this.logger.debug(`Send message to ${email}: ${message}`);
    return this.chatgptPoolService.sendMessage(message, {
      ...options,
      email: email,
    });
  }
  async startChatgptInstance(email: string) {
    const account = await this.prismaService.chatGPTAccount.findUnique({
      where: { email },
    });
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
    });
    this.logger.debug(`Found ${accounts.length} down accounts`);
    for (const account of accounts) {
      this.startChatgptInstance(account.email);
    }
  }
}
