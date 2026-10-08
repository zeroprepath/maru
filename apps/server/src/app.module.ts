import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SignalingModule } from './signaling/signaling.module.js';
import { TurnModule } from './turn/turn.module.js';

@Module({
  imports: [
    SignalingModule,
    TurnModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
