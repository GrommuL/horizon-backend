import { Resolver } from '@nestjs/graphql'
import { Subscription, Args, Context, Mutation } from '@nestjs/graphql'
import { Request } from 'express'
import { UseFilters, UseGuards } from '@nestjs/common'
import { PubSub } from 'graphql-subscriptions'

import { LiveChatroomService } from '@/live-chatroom/live-chatroom.service'
import { UserService } from '@/user/user.service'
import { User } from '@/user/user.type'
import { GraphQLErrorFilter } from '@/filters/custom-exception.filter'
import { GraphqlAuthGuard } from '@/auth/graphql-auth.guard'

@Resolver()
export class LiveChatroomResolver {
	private pubSub: PubSub
	constructor(
		private readonly liveChatroomService: LiveChatroomService,
		private readonly userService: UserService
	) {
		this.pubSub = new PubSub()
	}

	@Subscription(() => [User], {
		nullable: true,
		resolve: (value) => value.liveUsers,
		filter: (payload, variables) => {
			return payload.chatroomId === variables.chatroomId
		}
	})
	liveUsersInChatroom(@Args('chatroomId') chatroomId: number) {
		return this.pubSub.asyncIterator(`liveUsersInChatroom.${chatroomId}`)
	}

	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GraphqlAuthGuard)
	@Mutation(() => Boolean)
	async enterChatroom(@Args('chatroomId') chatroomId: string, @Context() context: { request: Request }) {
		const user = await this.userService.getUser(context.request.user.sub)

		await this.liveChatroomService.addLiveUserToChatroom(chatroomId, user)

		const liveUsers = await this.liveChatroomService.getLiveUsersForChatroom(chatroomId).catch((error) => {
			console.log('getLiveUsersForChatroom error', error)
		})

		await this.pubSub
			.publish(`liveUsersInChatroom.${chatroomId}`, {
				liveUsers,
				chatroomId
			})
			.catch((error) => {
				console.log('pubSub error', error)
			})
		return true
	}

	@UseFilters(GraphQLErrorFilter)
	@UseGuards(GraphqlAuthGuard)
	@Mutation(() => Boolean)
	async leaveChatroom(@Args('chatroomId') chatroomId: string, @Context() context: { request: Request }) {
		const user = await this.userService.getUser(context.request.user.sub)

		await this.liveChatroomService.removeLiveUserFromChatroom(chatroomId, user)

		const liveUsers = await this.liveChatroomService.getLiveUsersForChatroom(chatroomId)

		await this.pubSub.publish(`liveUsersInChatroom.${chatroomId}`, {
			liveUsers,
			chatroomId
		})

		return true
	}
}
