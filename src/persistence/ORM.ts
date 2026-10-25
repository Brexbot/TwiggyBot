import { PrismaClient } from '../../prisma/generated/prisma-client-js/index.js'
import { singleton } from 'tsyringe'
import { createAdapter } from './adapter.js'

@singleton()
export class ORM extends PrismaClient {
  constructor() {
    super({ adapter: createAdapter() })
  }
}
