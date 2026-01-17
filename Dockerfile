# Step 1: Build React App
# Using node:24-alpine to match package.json engine requirements
FROM node:24-alpine as build
WORKDIR /app 

# Accept build arguments (even if not used, to avoid warnings)
ARG REACT_APP_MANGO_API_URL
ARG REACT_APP_MANGO_API_KEY

# Set as environment variables for React build
ENV REACT_APP_MANGO_API_URL=${REACT_APP_MANGO_API_URL}
ENV REACT_APP_MANGO_API_KEY=${REACT_APP_MANGO_API_KEY}

# Copy package files and .npmrc to suppress warnings
COPY package.json package-lock.json* ./
COPY .npmrc ./
# Install dependencies (postinstall script will update browserslist automatically)
# Set npm config to suppress all warnings and notices
ENV npm_config_loglevel=error
ENV npm_config_update_notifier=false
# Suppress Node.js deprecation warnings (fs.F_OK, etc.)
ENV NODE_OPTIONS="--no-deprecation"
# Suppress browserslist warnings
ENV BROWSERSLIST_IGNORE_OLD_DATA=true
# Suppress ESLint warnings during build
ENV ESLINT_NO_DEV_ERRORS=true
ENV DISABLE_ESLINT_PLUGIN=true
RUN npm install --legacy-peer-deps 2>&1 | sed '/npm notice/d; /npm warn/d' || npm install --legacy-peer-deps
# Explicitly update browserslist to avoid warnings (silent)
RUN npx --yes update-browserslist-db@latest > /dev/null 2>&1 || true
COPY . .
# chains.json is at root level, import path '../../chains.json' from src/services/ works correctly
# No need to copy to src/ - the root-level file is accessible
# Build the application (suppress Node.js, browserslist, and ESLint warnings)
RUN GENERATE_SOURCEMAP=false NODE_OPTIONS="--no-deprecation" BROWSERSLIST_IGNORE_OLD_DATA=true ESLINT_NO_DEV_ERRORS=true DISABLE_ESLINT_PLUGIN=true npm run build

# Step 2: Server With Nginx
FROM nginx:1.23-alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf *
COPY --from=build /app/build .
EXPOSE 80
ENTRYPOINT [ "nginx", "-g", "daemon off;" ]

#Comentario##