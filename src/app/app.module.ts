import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver } from '@nestjs/apollo'
import { join } from 'path'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AppController } from '@/app/app.controller'
import { AppService } from '@/app/app.service'
import { AuthModule } from '@/auth/auth.module'
import { UserModule } from '@/user/user.module'

@Module({
	imports: [
		AuthModule,
		UserModule,
		GraphQLModule.forRootAsync({
			imports: [ConfigModule, AppModule],
			inject: [ConfigService],
			driver: ApolloDriver,
			useFactory: async (configService: ConfigService) => {
				return {
					playground: true,
					autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
					sortSchema: true
				}
			}
		}),
		ConfigModule.forRoot({
			isGlobal: true
		})
	],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
