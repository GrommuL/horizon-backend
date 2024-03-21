import { Module } from '@nestjs/common'
import { ServeStaticModule } from '@nestjs/serve-static'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver } from '@nestjs/apollo'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { RedisPubSub } from 'graphql-redis-subscriptions'
import { join } from 'path'

import { AppController } from '@/app/app.controller'
import { AppService } from '@/app/app.service'
import { AuthModule } from '@/auth/auth.module'
import { UserModule } from '@/user/user.module'
import { TokenService } from '@/token/token.service'

const pubSub = new RedisPubSub({
	connection: {
		host: process.env.REDIS_HOST || 'localhost',
		port: parseInt(process.env.REDIS_PORT || '6379', 10),
		retryStrategy: (times) => {
			return Math.min(times * 50, 2000)
		}
	}
})

@Module({
	imports: [
		ServeStaticModule.forRoot({
			rootPath: join(__dirname, '..', 'public'),
			serveRoot: '/'
		}),
		AuthModule,
		UserModule,
		GraphQLModule.forRootAsync({
			imports: [ConfigModule, AppModule],
			inject: [ConfigService],
			driver: ApolloDriver,
			useFactory: async (configService: ConfigService, tokenService: TokenService) => {
				return {
					installSubscriptionHandlers: true,
					playground: true,
					autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
					sortSchema: true,
					subscriptions: {
						'graphql-ws': true,
						'subscriptions-transport-ws': true
					},
					onConnect: (connectionParams) => {
						const token = tokenService.extractToken(connectionParams)

						if (!token) {
							throw new Error('Token not provided')
						}
						const user = tokenService.validateToken(token)
						if (!user) {
							throw new Error('Invalid token')
						}
						return { user }
					},
					context: ({ request, response, connection }) => {
						if (connection) {
							return { request, response, user: connection.context.user, pubSub }
						}
						return { request, response }
					}
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
