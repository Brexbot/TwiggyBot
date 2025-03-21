import { PrismaClient } from '../../prisma/generated/prisma-client-js/index.js'
import { singleton } from 'tsyringe'

@singleton()
export class ORM extends PrismaClient {}
