import { Injectable } from '@nestjs/common'
import * as fs from 'fs'
import { join } from 'path'

import { DatabaseService } from '@/database/database.service'

@Injectable()
export class UserService {
	constructor(private readonly database: DatabaseService) {}

	async updateProfile(userId: string, fullname: string, avatarUrl: string) {
		if (avatarUrl) {
			const oldUser = await this.database.user.findUnique({ where: { id: userId } })

			const updatedUser = await this.database.user.update({ where: { id: userId }, data: { fullname, avatarUrl } })

			if (oldUser.avatarUrl) {
				const imageName = oldUser.avatarUrl.split('/').pop()
				const imagePath = join(__dirname, '..', '..', 'public', 'images', imageName)

				if (fs.existsSync(imagePath)) {
					fs.unlinkSync(imagePath)
				}
			}

			return updatedUser
		}

		return await this.database.user.update({ where: { id: userId }, data: { fullname } })
	}

	async searchUsers(fullname: string, userId: string) {
		return this.database.user.findMany({ where: { fullname: { contains: fullname }, id: { not: userId } } })
	}
}
