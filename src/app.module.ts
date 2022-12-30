import { Logger, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'nestjs-prisma';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppResolver } from './app.resolver';
import config from 'src/configs/config';
import { loggingMiddleware } from 'src/common/middleware/logging.middleware';
import { ChatgptModule } from './chatgpt/chatgpt.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [loggingMiddleware(new Logger('PrismaMiddleware'))], // configure your prisma middleware
      },
    }),
    ChatgptModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver],
})
export class AppModule {}
