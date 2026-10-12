# IFX VM Dashboard

Dashboard responsive para administrar infraestructura virtual, construido para la prueba técnica Full Stack de IFX. Incluye autenticación por cookie HttpOnly, permisos por rol, operaciones optimistas, SQLite y sincronización en tiempo real con Socket.IO.

## Requisitos

- Node.js 20.19+ o 22.12+.
- npm 10+.

## Inicio local

1. Clona el repositorio cuando lo publiques en GitHub y entra a la carpeta `vm-dashboard`.
2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Copia `.env.example` como `.env`. Para desarrollo local puedes mantener los valores incluidos; cambia `JWT_SECRET` por una cadena aleatoria larga si vas a compartir el entorno.
4. Inicia la API y el frontend:

   ```bash
   npm run dev
   ```

5. Abre [http://localhost:5173](http://localhost:5173). La API estará en `http://localhost:4000`.

La base SQLite se crea automáticamente en `apps/api/data/vms.sqlite` con los usuarios y máquinas de demostración. No se requiere crear tablas ni correr una migración manual.

## Cuentas de prueba

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@ifx.test` | `Admin123!` |
| Cliente | `client@ifx.test` | `Client123!` |

La primera ejecución siembra ambas cuentas y cinco máquinas virtuales de ejemplo. Las contraseñas se guardan con hash bcrypt; no se almacena el texto de la contraseña.

## Funcionalidad incluida

- Panel con totales de vCPU, RAM y almacenamiento de máquinas activas.
- Listado con búsqueda y filtro por estado.
- Navegación con rutas privadas: `/dashboard`, `/vms`, `/vms/new` y `/vms/:id/edit`.
- Creación, edición y eliminación de máquinas para Administrador, con actualización optimista y reversión si la API falla.
- Vista de solo lectura para Cliente: las acciones administrativas no se renderizan.
- Validación en el cliente y en el servidor.
- Estado sincronizado en tiempo real por Socket.IO entre sesiones autenticadas.
- Tema oscuro y claro, diseño adaptable, skeletons, estados vacíos y notificaciones toast.
- Sesión JWT en cookie `HttpOnly`; el token no se expone al frontend.

## Comandos

```bash
npm run dev       # API + frontend
npm run dev:api   # solo API
npm run dev:web   # solo frontend
npm run build    # compilación de producción de API y frontend
```

## Documentación

- [Manual de uso](docs/MANUAL_DE_USO.md)
- [Documentación técnica](docs/DOCUMENTACION_TECNICA.md)
- [Bitácora de uso de IA y prompts](docs/BITACORA_IA.md)

## Preparación para despliegue

El entorno `.env.example` está configurado para desarrollo local. Para publicar la API, define un `JWT_SECRET` aleatorio y `COOKIE_SECURE=true` detrás de HTTPS. Ajusta `WEB_ORIGIN` al dominio del frontend. No subas el archivo `.env` ni la base local a GitHub.

