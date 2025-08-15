# Use Bun base image
FROM oven/bun:latest AS base

WORKDIR /app

# Copy only dependency files first for better caching
COPY bun.lockb package.json ./

FROM base AS deps
# Install dependencies with Bun
RUN bun install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS final
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD ["bun", "dist/main.js"]
