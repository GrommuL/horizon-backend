import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { LiveChatroomService } from '@/live-chatroom/live-chatroom.service'
import { LiveChatroomResolver } from '@/live-chatroom/live-chatroom.resolver'

import { DatabaseModule } from '@/database/database.module'
import { UserService } from '@/user/user.service'

@Module({
	imports: [DatabaseModule],
	providers: [LiveChatroomService, LiveChatroomResolver, UserService, JwtService]
})
export class LiveChatroomModule {}
