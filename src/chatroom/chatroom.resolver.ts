import { Args, Context, Mutation, Query, Resolver, Subscription } from '@nestjs/graphql'
import { UseFilters, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { PubSub } from 'graphql-subscriptions'
import * as GraphQLUpload from 'graphql-upload/GraphQLUpload.js'

import { UserService } from '@/user/user.service'
import { ChatroomService } from '@/chatroom/chatroom.service'
import { Chatroom, Message } from '@/chatroom/chatroom.type'
import { User } from '@/user/user.type'
import { GraphQLErrorFilter } from '@/filters/custom-exception.filter'
import { GraphqlAuthGuard } from '@/auth/graphql-auth.guard'

@Resolver()
export class ChatroomResolver {
	public pubSub: PubSub

	constructor(
		private readonly chatroomService: ChatroomService,
		private readonly userService: UserService
	) {
		this.pubSub = new PubSub()
	}

	@Subscription((returns) => Message, {
		nullable: true,
		resolve: (value) => value.newMessage
	})
	newMessage(@Args('chatroomId') chatroomId: number) {
		return this.pubSub.asyncIterator(`newMessage.${chatroomId}`)
	}
	@Subscription(() => User, {
		nullable: true,
		resolve: (value) => value.user,
		filter: (payload, variables) => {
			console.log('payload1', variables, payload.typingUserId)
			return variables.userId !== payload.typingUserId
		}
	})
	userStartedTyping(@Args('chatroomId') chatroomId: string, @Args('userId') userId: string) {
		return this.pubSub.asyncIterator(`userStartedTyping.${chatroomId}`)
	}

	@Subscription(() => User, {
		nullable: true,
		resolve: (value) => value.user,
		filter: (payload, variables) => {
			return variables.userId !== payload.typingUserId
		}
	})
	userStoppedTyping(@Args('chatroomId') chatroomId: string, @Args('userId') userId: number) {
		return this.pubSub.asyncIterator(`userStoppedTyping.${chatroomId}`)
	}

	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GraphqlAuthGuard)
	@Mutation((returns) => User)
	async userStartedTypingMutation(@Args('chatroomId') chatroomId: string, @Context() context: { request: Request }) {
		const user = await this.userService.getUser(context.request.user.sub)
		await this.pubSub.publish(`userStartedTyping.${chatroomId}`, {
			user,
			typingUserId: user.id
		})
		return user
	}
	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GraphqlAuthGuard)
	@Mutation(() => User, {})
	async userStoppedTypingMutation(@Args('chatroomId') chatroomId: number, @Context() context: { request: Request }) {
		const user = await this.userService.getUser(context.request.user.sub)

		await this.pubSub.publish(`userStoppedTyping.${chatroomId}`, {
			user,
			typingUserId: user.id
		})

		return user
	}

	@UseGuards(GraphqlAuthGuard)
	@Mutation(() => Message)
	async sendMessage(
		@Args('chatroomId') chatroomId: string,
		@Args('content') content: string,
		@Context() context: { request: Request },
		@Args('image', { type: () => GraphQLUpload, nullable: true })
		image?: GraphQLUpload
	) {
		let imagePath = null
		if (image) imagePath = await this.chatroomService.saveImage(image)
		const newMessage = await this.chatroomService.sendMessage(chatroomId, content, context.request.user.sub, imagePath)
		await this.pubSub
			.publish(`newMessage.${chatroomId}`, { newMessage })
			.then((response) => {
				console.log('Published', response)
			})
			.catch((error) => {
				console.log('Error', error)
			})

		return newMessage
	}

	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GraphqlAuthGuard)
	@Mutation(() => Chatroom)
	async createChatroom(@Args('name') name: string, @Context() context: { request: Request }) {
		return this.chatroomService.createChatroom(name, context.request.user.sub)
	}

	@Mutation(() => Chatroom)
	async addUsersToChatroom(@Args('chatroomId') chatroomId: string, @Args('userIds', { type: () => [String] }) userIds: string[]) {
		return this.chatroomService.addUsersToChatroom(chatroomId, userIds)
	}

	@Query(() => [Chatroom])
	async getChatroomsForUser(@Args('userId') userId: string) {
		return this.chatroomService.getChatroomsForUser(userId)
	}

	@Query(() => [Message])
	async getMessagesForChatroom(@Args('chatroomId') chatroomId: string) {
		return this.chatroomService.getMessagesForChatroom(chatroomId)
	}
	@Mutation(() => String)
	async deleteChatroom(@Args('chatroomId') chatroomId: string) {
		await this.chatroomService.deleteChatroom(chatroomId)
		return 'Chatroom deleted successfully'
	}
}
