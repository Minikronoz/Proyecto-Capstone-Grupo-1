Instalación y Configuración del Proyecto

Este proyecto está compuesto por los siguientes módulos:

Backend: Node.js, Express y Playwright (Scraping)

Frontend: React

Base de Datos: MongoDB Atlas

Autenticación: Gestión de usuarios mediante MongoDB

Requisitos Previos

Antes de comenzar, se debe contar con los siguientes requisitos instalados:

Node.js (versión 18 o superior)

npm

Git

Cuenta activa en MongoDB Atlas

Instalación del Backend

Clonar el repositorio:

git clone https://github.com/tu_usuario/tu_repositorio.git


Acceder a la carpeta del backend:

cd backend


Instalar dependencias:

npm install


Instalar Playwright y sus navegadores:

npx playwright install


Crear archivo de variables de entorno .env:

PORT=3000
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/SistemaDeReportes
DB_NAME=SistemaDeReportes


Ejecutar el servidor:

npm run dev


El backend quedará disponible en:

http://localhost:3000

Instalación del Frontend

Acceder a la carpeta del frontend:

cd frontend


Instalar dependencias:

npm install


Ejecutar la aplicación:

npm run dev


El sistema quedará disponible en:

http://localhost:5173

Ejecución del Proceso de Scraping

El scraping se ejecuta desde el backend utilizando Playwright para extraer automáticamente los precios desde los supermercados.

Ejecución:

npm run scraper


Los datos capturados se almacenan en MongoDB Atlas.

Base de Datos

La base de datos está alojada en MongoDB Atlas y cuenta con las siguientes colecciones principales:

productos

priceHistory

usuarios

busquedas

clicks

locales_supermercados

Estas colecciones permiten realizar análisis históricos, segmentación territorial y generación de dashboards analíticos.

Flujo General de Funcionamiento

El proceso de scraping obtiene los datos desde los supermercados.

Los datos son almacenados en MongoDB Atlas.

El backend procesa y expone la información mediante una API REST.

El frontend consume la API.

El usuario visualiza las comparaciones y los análisis.

Estado del Proyecto

El sistema se encuentra completamente operativo, incluyendo:

Backend funcional

Scraping operativo

Base de datos centralizada

Autenticación con MongoDB

Dashboards analíticos

Comparador de precios activo
