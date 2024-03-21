import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { UserResolver } from '@/user/user.resolver'
import { UserService } from '@/user/user.service'
import { DatabaseModule } from '@/database/database.module'

@Module({
	imports: [DatabaseModule],
	providers: [UserResolver, UserService, JwtService]
})
export class UserModule {}
