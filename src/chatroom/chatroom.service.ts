import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createWriteStream } from 'fs'

import { DatabaseService } from '@/database/database.service'

@Injectable()
export class ChatroomService {
	constructor(
		private readonly database: DatabaseService,
		private readonly configService: ConfigService
	) {}

	async getChatroom(id: string) {
		return this.database.chatroom.findUnique({ where: { id } })
	}

	async createChatroom(name: string, sub: string) {
		const existingChatroom = await this.database.chatroom.findFirst({ where: { name } })

		if (existingChatroom) {
			throw new BadRequestException({ name: 'Chatroom already exists' })
		}
		return this.database.chatroom.create({ data: { name, users: { connect: { id: sub } } } })
	}

	async addUsersToChatroom(chatroomId: string, userIds: string[]) {
		const existingChatroom = await this.database.chatroom.findUnique({ where: { id: chatroomId } })

		if (!existingChatroom) {
			throw new BadRequestException({ chatroomId: 'Chatroom does not exist' })
		}

		return await this.database.chatroom.update({
			where: { id: chatroomId },
			data: { users: { connect: userIds.map((id) => ({ id: id })) } },
			include: { users: true }
		})
	}

	async getChatroomsForUser(userId: string) {
		return this.database.chatroom.findMany({
			where: { users: { some: { id: userId } } },
			include: { users: { orderBy: { createdAt: 'desc' } }, messages: { take: 1, orderBy: { createdAt: 'desc' } } }
		})
	}

	async sendMessage(chatroomId: string, message: string, userId: string, imagePath: string) {
		return await this.database.message.create({
			data: { content: message, imageUrl: imagePath, chatroomId, userId },
			include: { chatroom: { include: { users: true } }, user: true }
		})
	}

	async saveImage(image: { createReadStream: () => any; filename: string; mimetype: string }) {
		const validImageTypes = ['image/jpeg', 'image/png', 'image/gif']

		if (!validImageTypes.includes(image.mimetype)) {
			throw new BadRequestException({ image: 'Invalid image type' })
		}

		const imageName = `${Date.now()}-${image.filename}`
		const imagePath = `${this.configService.get('IMAGE_PATH')}/${imageName}`
		const stream = image.createReadStream()
		const outputPath = `public${imagePath}`
		const writeStream = createWriteStream(outputPath)
		stream.pipe(writeStream)

		await new Promise((resolve, reject) => {
			stream.on('end', resolve)
			stream.on('error', reject)
		})

		return imagePath
	}
	async getMessagesForChatroom(chatroomId: string) {
		return await this.database.message.findMany({
			where: { chatroomId },
			include: { chatroom: { include: { users: { orderBy: { createdAt: 'asc' } } } }, user: true }
		})
	}

	async deleteChatroom(chatroomId: string) {
		return this.database.chatroom.delete({ where: { id: chatroomId } })
	}
}
