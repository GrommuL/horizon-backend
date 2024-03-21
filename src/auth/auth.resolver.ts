import { BadRequestException } from '@nestjs/common'
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql'
import { Request, Response } from 'express'

import { AuthService } from '@/auth/auth.service'
import { LoginDto, RegisterDto } from '@/auth/auth.dto'
import { LoginResponse, RegisterResponse } from '@/auth/auth.type'

@Resolver()
export class AuthResolver {
	constructor(private readonly authService: AuthService) {}

	@Mutation(() => RegisterResponse)
	async register(@Args('registerInput') registerDto: RegisterDto, @Context() context: { response: Response }) {
		const { password, confirmPassword } = registerDto

		if (password !== confirmPassword) {
			throw new BadRequestException({
				confirmPassword: 'Password and confirm password are not the same.'
			})
		}

		const { user } = await this.authService.register(registerDto, context.response)

		return user
	}

	@Mutation(() => LoginResponse)
	async login(@Args('loginInput') loginDto: LoginDto, @Context() context: { response: Response }) {
		return this.authService.login(loginDto, context.response)
	}

	@Mutation(() => String)
	async logout(@Context() context: { response: Response }) {
		return this.authService.logout(context.response)
	}

	@Mutation(() => String)
	async refreshToken(@Context() context: { request: Request; response: Response }) {
		try {
			return this.authService.refreshToken(context.request, context.response)
		} catch (error) {
			throw new BadRequestException(error.message)
		}
	}
}
