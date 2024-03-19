import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { Request, Response } from 'express'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { User } from '@prisma/client'
import { hash, compare } from 'bcryptjs'

import { DatabaseService } from '@/database/database.service'
import { LoginDto, RegisterDto } from '@/auth/auth.dto'

@Injectable()
export class AuthService {
	constructor(
		private readonly jwtService: JwtService,
		private readonly database: DatabaseService,
		private readonly configService: ConfigService
	) {}

	async refreshToken(request: Request, response: Response) {
		const refreshToken = request.cookies['refresh_token']

		if (!refreshToken) {
			throw new UnauthorizedException('Refresh token not found')
		}

		let payload

		try {
			payload = this.jwtService.verify(refreshToken, {
				secret: this.configService.get<string>('REFRESH_TOKEN_SECRET')
			})
		} catch (error) {
			throw new UnauthorizedException('Invalid or expired refresh token')
		}

		const existingUser = await this.database.user.findUnique({ where: { id: payload.sub } })

		if (!existingUser) {
			throw new BadRequestException('User no longer exists')
		}

		const expiresIn = 15000
		const expiration = Math.floor(Date.now() / 1000) + expiresIn

		const accessToken = this.jwtService.sign({ ...payload, exp: expiration }, { secret: this.configService.get<string>('ACCESS_TOKEN_SECRET') })

		response.cookie('access_token', accessToken, { httpOnly: true })

		return accessToken
	}

	private async issueTokens(user: User, response: Response) {
		const payload = { username: user.fullname, sub: user.id }

		const accessToken = this.jwtService.sign(
			{ ...payload },
			{
				secret: this.configService.get<string>('ACCESS_TOKEN_SECRET'),
				expiresIn: '150sec'
			}
		)

		const refreshToken = this.jwtService.sign(payload, {
			secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
			expiresIn: '7d'
		})

		response.cookie('access_token', accessToken, { httpOnly: true })
		response.cookie('refresh_token', refreshToken, {
			httpOnly: true
		})

		return { user }
	}

	async validateUser(loginDto: LoginDto) {
		const { email, password } = loginDto

		const user = await this.database.user.findUnique({ where: { email } })

		const verifiedPassword = await compare(password, user.password)

		if (user && verifiedPassword) {
			return user
		}

		return null
	}

	async register(registerDto: RegisterDto, response: Response) {
		const { email, password, fullname } = registerDto

		const existingUser = await this.database.user.findUnique({
			where: { email }
		})

		if (existingUser) {
			throw new BadRequestException({ email: 'Email already in use' })
		}

		const hashedPassword = await hash(password, 10)

		const user = await this.database.user.create({
			data: {
				fullname,
				email,
				password: hashedPassword
			}
		})

		return this.issueTokens(user, response)
	}

	async login(loginDto: LoginDto, response: Response) {
		const user = await this.validateUser(loginDto)
		if (!user) {
			throw new BadRequestException({
				invalidCredentials: 'Invalid credentials'
			})
		}
		return this.issueTokens(user, response)
	}

	async logout(response: Response) {
		response.clearCookie('access_token')
		response.clearCookie('refresh_token')
		return 'Successfully logged out'
	}
}
