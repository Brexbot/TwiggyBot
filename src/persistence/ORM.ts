import { PrismaClient } from '../../prisma/generated/prisma-client-js'
import { singleton } from "tsyringe";

@singleton()
export class ORM extends PrismaClient {}
