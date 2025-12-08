Descripción General del Proyecto

Este proyecto corresponde al desarrollo de una plataforma web de comparación y análisis de precios de supermercados en Chile. El sistema permite a los consumidores comparar precios en tiempo real entre distintas cadenas, mientras que a los negocios les entrega información analítica basada en búsquedas, comportamiento de usuarios y variaciones históricas de precios.

La plataforma integra procesos automatizados de web scraping para la captura de datos, un backend encargado del procesamiento y exposición de la información mediante una API REST, una base de datos centralizada en MongoDB Atlas para el almacenamiento histórico, y un frontend web que presenta los resultados de manera visual e interactiva. El objetivo principal es apoyar la toma de decisiones tanto de consumidores como de dueños de negocios mediante datos confiables y análisis comparativos.

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

Git https://github.com/Minikronoz/Proyecto-Capstone-Grupo-1

Cuenta activa en MongoDB Atlas

Instalación del Backend

Clonar el repositorio:

git clone 


Acceder a la carpeta del backend:

cd backend


Instalar dependencias:

npm install


Instalar Playwright y sus navegadores:

npx playwright install


Crear archivo de variables de entorno .env:

MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/SistemaDeReportes
DB_NAME=SistemaDeReportes
SESSION_SECRET="Clave_ejemplo"


Ejecutar el servidor:

npm run dev


El backend quedará disponible en:

http://localhost:4000

Instalación del Frontend

Acceder a la carpeta del frontend:

cd 'Fase 2\Evidencias Proyecto\Evidencias de sistema\Aplicación'


Instalar dependencias:

npm install


Ejecutar la aplicación:

npm run dev


El sistema quedará disponible en:

http://localhost:4000


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
