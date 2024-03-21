import { Resolver, Query, Context, Mutation, Args } from '@nestjs/graphql'
import { Request } from 'express'
import { UseGuards } from '@nestjs/common'
import { createWriteStream } from 'fs'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js'

import { GraphqlAuthGuard } from '@/auth/graphql-auth.guard'
import { UserService } from '@/user/user.service'
import { User } from '@/user/user.type'

@Resolver()
export class UserResolver {
	constructor(private readonly userService: UserService) {}

	@UseGuards(GraphqlAuthGuard)
	@Mutation(() => User)
	async updateProfile(
		@Args('fullname') fullname: string,
		@Args('file', { type: () => GraphQLUpload, nullable: true })
		file: GraphQLUpload.FileUpload,
		@Context() context: { request: Request }
	) {
		const imageUrl = file ? await this.storeImageAndGetUrl(file) : null
		const userId = context.request.user.sub

		return this.userService.updateProfile(userId, fullname, imageUrl)
	}

	private async storeImageAndGetUrl(file: GraphQLUpload) {
		const { createReadStream, filename } = await file
		const uniqueFilename = `${uuid()}_${filename}`
		const imagePath = join(process.cwd(), 'public', 'images', uniqueFilename)
		const imageUrl = `${process.env.APP_URL}/images/${uniqueFilename}`
		const readStream = createReadStream()

		readStream.pipe(createWriteStream(imagePath))

		return imageUrl
	}

	@UseGuards(GraphqlAuthGuard)
	@Query(() => [User])
	async searchUsers(@Args('fullname') fullname: string, @Context() context: { request: Request }) {
		return this.userService.searchUsers(fullname, context.request.user.sub)
	}
}
