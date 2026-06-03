# AI Creator Studio

Monorepo listo para producción para generar imágenes y video con IA desde Android.

## Stack
- Frontend: React Native + Expo
- Backend: Node.js + Express
- IA: AUTOMATIC1111 / Stable Diffusion, AnimateDiff vía A1111, text-to-video vía Replicate
- DevOps: Docker Compose, scripts Ubuntu VPS

## Estructura
- `apps/mobile` app Android
- `apps/api` backend REST
- `infra/docker-compose.yml` servicios
- `scripts/install.sh` instalación Ubuntu

## Inicio rápido
1. Copiar `.env.example` a `.env` en `apps/api` y `apps/mobile`.
2. Configurar URLs y tokens.
3. Levantar backend con Docker Compose.
4. Instalar dependencias mobile y compilar APK.

## Build APK
Ver `apps/mobile/README.md`.
