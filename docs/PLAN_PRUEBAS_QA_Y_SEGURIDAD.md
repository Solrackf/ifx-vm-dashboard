# Plan de pruebas QA y seguridad

## Objetivo

Verificar los flujos funcionales y los controles principales del dashboard con datos locales aislados. La suite combina pruebas de lógica, componentes, API, navegador, accesibilidad y una comprobación básica de concurrencia. No representa una certificación de seguridad ni una prueba de penetración exhaustiva.

## Capas y cobertura

| Capa                       | Herramienta                   | Cobertura                                                                                                                                                                   |
| -------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unitarias de frontend      | Vitest                        | Reglas de validación para nombre, sistema operativo y límites de CPU, RAM y disco; transiciones y deduplicación del store.                                                  |
| Componentes                | Vitest + Testing Library      | Validación al perder foco y al corregir; envío de datos válidos; acciones administrativas visibles solo para Administrador.                                                 |
| Integración de API         | Node Test Runner + HTTP local | Health check, autenticación, cookie, ausencia del JWT en el cuerpo, esquema y rangos, roles, CRUD, respuestas 404, límites de cuerpo y rate limit de login.                 |
| Tiempo real                | Socket.IO client              | Rechazo de conexiones anónimas y eventos autenticados `vm:created`, `vm:updated` y `vm:deleted`.                                                                            |
| Seguridad local            | Pruebas negativas HTTP        | Cookie `HttpOnly`/`SameSite`, rechazo de sesiones inválidas, prohibición de mutaciones para Cliente, origen externo en escrituras, payload de inyección y exceso de tamaño. |
| Extremo a extremo          | Playwright                    | Inicio de sesión, CRUD y búsqueda de una VM, reversión optimista ante fallo controlado, ruta privada para Cliente y ausencia de acciones administrativas.                   |
| Accesibilidad automatizada | axe-core + Playwright         | Contraste y reglas WCAG 2.1 A/AA en login y dashboard, con tema oscuro y claro.                                                                                             |
| Concurrencia básica        | Node Test Runner              | 25 lecturas simultáneas al health check; todas deben responder correctamente. Es un smoke test, no una prueba de carga o capacidad.                                         |
| Compilación y formato      | TypeScript, Vite y Prettier   | Verificación de tipos y bundle de producción; consistencia de formato.                                                                                                      |

## Ejecución

Desde la raíz del repositorio:

```bash
npm install
npm test
npm run test:e2e
npm run test:all
npm run build
npm run format:check
```

Playwright utiliza Edge si encuentra la instalación local configurada o la ruta `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. En otros equipos instala Chromium con `npx playwright install chromium`. Los servidores de prueba usan puertos locales dedicados (`4179` y `5180`); la API recibe un secreto de prueba y SQLite en el directorio temporal del sistema. Setup y teardown eliminan esa base antes y después del recorrido. La suite no usa credenciales reales ni envía tráfico a servicios externos.

## Lectura de resultados

- Las pruebas de seguridad comprueban controles definidos para esta aplicación y respuestas observables desde el cliente. No ejecutan escaneo externo ni explotación sobre infraestructura publicada.
- La comprobación CORS distingue entre la política que el navegador aplica al leer respuestas y el rechazo server-side de escrituras con origen no autorizado.
- La ráfaga concurrente comprueba disponibilidad funcional de una ruta liviana; no mide latencia objetivo, consultas SQLite bajo carga, usuarios simultáneos sostenidos ni capacidad de producción.
- axe detecta ciertos problemas de accesibilidad automatizables; el resultado no sustituye la navegación con teclado, lector de pantalla ni revisión manual completa.
- No se incluye una suite de carga distribuida, pruebas de recuperación de desastre, compatibilidad exhaustiva entre navegadores ni un pentest independiente de terceros.

## Mantenimiento

Cada cambio en autenticación, permisos, contrato de VM, persistencia o eventos Socket.IO debe actualizar la cobertura correspondiente. Mantener los casos E2E aislados y los nombres de máquinas temporales para poder repetir la suite sin modificar la base de desarrollo.
