import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Same location Prisma 5 used (relative to the schema), resolved from this file so it works from both src/ and build/
const DEFAULT_DATABASE_URL = new URL('../../prisma/dev.db', import.meta.url).href

export function createAdapter(): PrismaBetterSqlite3 {
  return new PrismaBetterSqlite3(
    { url: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL },
    // Existing databases store DateTime columns as epoch milliseconds, the default (ISO 8601 strings) would break
    // comparisons against those rows
    { timestampFormat: 'unixepoch-ms' }
  )
}
