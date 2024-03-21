import { Module } from '@nestjs/common'

import { ChatroomResolver } from '@/chatroom/chatroom.resolver'
import { ChatroomService } from '@/chatroom/chatroom.service'
import { DatabaseModule } from '@/database/database.module'
import { UserService } from '@/user/user.service'

@Module({
	imports: [DatabaseModule],
	providers: [ChatroomResolver, ChatroomService, UserService]
})
export class ChatroomModule {}
