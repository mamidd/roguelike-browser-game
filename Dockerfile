# Stage 1: Build
FROM node:18-alpine as build-stage

WORKDIR /app

# Copia package.json e package-lock.json
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia il resto dei file del progetto
COPY . .

# Compila l'applicazione
RUN npm run build

# Stage 2: Production
FROM nginx:stable-alpine as production-stage

# Copia la configurazione di nginx personalizzata
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia i file compilati dalla stage di build
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Esponi la porta 80
EXPOSE 80

# Avvia nginx
CMD ["nginx", "-g", "daemon off;"]
