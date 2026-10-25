import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Matches the default used by the bot at runtime, see src/persistence/ORM.ts
    url: process.env.DATABASE_URL ?? 'file:./prisma/dev.db',
  },
})
