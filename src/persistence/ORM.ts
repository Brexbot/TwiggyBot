import { Prisma, PrismaClient } from "@prisma/client";
import { singleton } from "tsyringe";

@singleton()
export class ORM extends PrismaClient {}
