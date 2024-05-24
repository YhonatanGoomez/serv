# Imagen base
FROM node:16-alpine

# Establecer directorio de trabajo
WORKDIR /usr/src/app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install
RUN npm install mongoose
# Copiar el resto de los archivos del proyecto
COPY . .

# Exponer el puerto en el que corre la aplicación
EXPOSE 3000

# Comando para correr la aplicación
CMD ["node", "server.js"]