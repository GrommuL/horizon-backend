import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

import { AuthResolver } from '@/auth/auth.resolver'
import { AuthService } from '@/auth/auth.service'
import { DatabaseModule } from '@/database/database.module'

@Module({
	imports: [DatabaseModule],
	providers: [AuthResolver, AuthService, JwtService]
})
export class AuthModule {}
