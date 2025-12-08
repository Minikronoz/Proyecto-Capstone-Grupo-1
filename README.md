Instalación y Configuración del Proyecto

Este proyecto está compuesto por los siguientes módulos:

Backend: Node.js, Express y Playwright (Scraping)

Frontend: React

Base de Datos: MongoDB Atlas

Autenticación: Firebase Authentication

Requisitos Previos

Antes de comenzar, se debe contar con los siguientes requisitos instalados:

Node.js (versión 18 o superior)

npm

Git

Cuenta activa en MongoDB Atlas

Cuenta activa en Firebase

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

FIREBASE_API_KEY=TU_API_KEY
FIREBASE_AUTH_DOMAIN=TU_AUTH_DOMAIN
FIREBASE_PROJECT_ID=TU_PROJECT_ID


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

El sistema ejecuta el scraping desde el backend utilizando Playwright para extraer los precios desde los supermercados.

Ejecución:

npm run scraper


Los datos se almacenan automáticamente en MongoDB Atlas.

Configuración de Firebase

El sistema utiliza Firebase para:

Registro de usuarios

Inicio de sesión

Gestión de perfiles

Las credenciales deben configurarse en el archivo .env.

Base de Datos

La base de datos está alojada en MongoDB Atlas y cuenta con las siguientes colecciones principales:

productos

priceHistory

usuarios

busquedas

clicks

locales_supermercados

Estas colecciones permiten realizar análisis históricos, segmentación territorial y generación de dashboards.

Flujo General de Funcionamiento

El scraping obtiene los productos desde los supermercados.

Los datos se almacenan en MongoDB Atlas.

El backend procesa la información.

El frontend consume la API.

El usuario visualiza comparaciones y análisis.

Estado del Proyecto

El sistema se encuentra completamente operativo, incluyendo:

Backend funcional

Scraping activo

Base de datos en la nube

Autenticación implementada

Dashboards analíticos

Comparador de precios operativo
