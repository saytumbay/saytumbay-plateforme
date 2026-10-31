# API SaytuMbay — image de production (contexte de construction : racine du dépôt).
#   docker build -f apps/api/Dockerfile -t saytumbay-api .

FROM node:22-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api --include-workspace-root=false
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w apps/api

FROM node:22-alpine AS run
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace apps/api --include-workspace-root=false --omit=dev && npm cache clean --force
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/drizzle apps/api/drizzle
USER node
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1
CMD ["node", "dist/server.js"]
