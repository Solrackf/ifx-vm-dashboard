# Bitácora de uso de inteligencia artificial

## Propósito y criterio de fidelidad

Esta bitácora explica cómo se utilizó la IA como herramienta de ejecución dentro de una solución planeada por el candidato. El candidato definió el alcance a partir del enunciado, eligió las tecnologías, fijó la dirección visual, decidió incluir tiempo real desde el inicio y revisó el resultado para orientar las iteraciones. La IA apoyó la implementación, la documentación y la incorporación de correcciones concretas.

Los prompts que aparecen como **reconstruidos** o **consolidados** describen fielmente las instrucciones, decisiones y criterios que guiaron el trabajo, pero no son transcripciones literales de un único mensaje. Se identifican así para que el evaluador pueda distinguir una reconstrucción editorial del historial textual exacto. Las evaluaciones citadas como insumo reflejan el reporte que el candidato compartió durante la revisión.

## Herramientas y modelos

| Participación | Herramienta / modelo | Uso |
| --- | --- | --- |
| Desarrollo | ChatGPT con Codex — GPT-6 Luna, razonamiento `high` | Implementar frontend, API, persistencia, autenticación, tiempo real y documentación siguiendo las decisiones del candidato. |
| Revisión independiente | Devin Desktop / Windsurf — SWE-2 High | Contrastar el entregable con el enunciado, reportar brechas y entregar feedback para dirigir correcciones. |

La documentación oficial de OpenAI enumera `high` entre los niveles de razonamiento compatibles con GPT-6 Luna: [GPT-6 Luna — OpenAI API](https://developers.openai.com/api/docs/models/gpt-6-luna).

## Secuencia de trabajo e intervención humana

| Etapa | Instrucción / intervención | Por qué se hizo | Solución ejecutada |
| --- | --- | --- | --- |
| 1. Delimitación | El candidato compartió la prueba, pidió convertirla a Markdown y decidió iniciar el desarrollo a partir de sus requisitos. | Tener una fuente legible para planear y verificar el alcance antes de programar. | Enunciado transcrito a Markdown y criterios funcionales y de entrega identificados. |
| 2. Decisiones base | El candidato confirmó React, TypeScript y Vite; Express y TypeScript; SQLite; WebSockets desde el inicio; experiencia local primero; manual, documentación técnica y cuentas de prueba. | Fijar el stack, el modo de operación y los entregables antes de ejecutar el desarrollo. | Monorepo npm con aplicaciones web y API, persistencia SQLite, Socket.IO y datos seed de demostración. |
| 3. Dirección visual | El candidato especificó minimalismo, elegancia sobria, ausencia de glassmorphism, drawers, jerarquía clara y transiciones profesionales. | Evitar una interfaz genérica y mantener una dirección consistente con el producto esperado. | Consola responsive con paleta sobria, tema claro/oscuro, formularios laterales y microtransiciones. |
| 4. Entregables | El candidato pidió documentación de uso y técnica, credenciales de prueba y una bitácora que identificara herramienta, modelo y prompts. | Permitir instalar, recorrer y evaluar la aplicación, y declarar el uso de IA con transparencia. | README, manual, documentación técnica y esta bitácora. |
| 5. Control de calidad | El candidato compartió una evaluación externa que señaló brechas concretas de rutas, estado global, validación en tiempo real, feedback visual de Socket.IO y Git. | Corregir aspectos observables contra el enunciado y elevar la organización del frontend. | React Router, Zustand, separación de componentes, validación al salir y corregir campos, resaltado de cambios y convenciones Git. |

La IA no definió por sí sola el objetivo del sistema ni sustituyó la revisión del candidato. Su función fue materializar instrucciones y corregir el código según criterios indicados y revisados por el candidato.

## Prompt 1 — Ejecución de la solución planeada · reconstruido

> **Fidelidad:** reconstrucción editorial del encargo de implementación. Consolida la prueba técnica y las decisiones del candidato recogidas durante la colaboración; no se presenta como mensaje literal. Su propósito es mostrar de forma reproducible qué debía construir la IA y bajo qué reglas.

```text
Actúa como agente de implementación full stack. El alcance, las prioridades y las decisiones de producto de esta solución ya fueron planeados por mí. Tu responsabilidad es ejecutar el desarrollo con criterio técnico, respetando esta especificación. No reemplaces las decisiones del candidato por preferencias propias ni declares cumplido algo que no esté implementado.

OBJETIVO
Construye una consola web para administrar máquinas virtuales, de acuerdo con la prueba técnica compartida. Debe incluir una SPA para los roles Administrador y Cliente, una API REST, persistencia local, autorización por rol, sincronización entre sesiones y documentación de entrega. Antes de cambiar el alcance, contrasta cada tarea con el enunciado y conserva las decisiones siguientes.

DECISIONES TÉCNICAS YA TOMADAS
- Frontend: React, TypeScript y Vite.
- Backend: Node.js, Express y TypeScript.
- Persistencia: SQLite, adecuada para ejecutar y revisar el proyecto localmente.
- Tiempo real: Socket.IO desde el inicio, no como mejora posterior.
- Organización: monorepo npm con frontend y API separados. Divide el código por responsabilidades y funcionalidades; evita concentrar la aplicación en un único componente.
- Estado frontend: distingue el estado de sesión, los datos compartidos del servidor y el estado efímero de interfaz. Mantén el inventario sincronizado entre solicitudes HTTP y eventos Socket.IO.

REQUISITOS FUNCIONALES DEL FRONTEND
- Crea una ruta pública de inicio de sesión y rutas privadas para el dashboard y el inventario. La creación y edición deben poder abrirse mediante rutas privadas identificables, aunque la interfaz de edición se presente en un drawer.
- Implementa dos roles: Administrador y Cliente. El Administrador puede consultar, crear, editar y eliminar máquinas. El Cliente puede consultar, pero no debe ver acciones de administración. La seguridad debe aplicarse también en el servidor.
- Cada VM debe manejar nombre, cantidad de cores, RAM, almacenamiento, sistema operativo y estado.
- Valida los campos mientras el usuario completa el formulario y vuelve a validar las entradas en la API.
- En altas, ediciones y eliminaciones, presenta el cambio de inmediato con actualización optimista. Si la petición falla, revierte el cambio y comunica el error.
- Muestra inventario, búsqueda y filtro por estado, junto con el total de VMs y la suma de cores, RAM y disco de las máquinas activas.
- Incluye visualizaciones claras de capacidad y disponibilidad. Calcula sus indicadores a partir de los datos disponibles; no muestres cifras ficticias de monitoreo como si fueran reales.
- Diseña estados de carga, skeletons, errores, estados vacíos y notificaciones toast.
- Cuando un cambio remoto llegue por Socket.IO, actualiza el inventario y resalta brevemente la fila afectada para que el usuario perciba qué cambió.

CONTRATO DE TIEMPO REAL
- Autentica la conexión de Socket.IO con la misma sesión de cookie que protege la API.
- Propaga creación, actualización y eliminación mediante eventos identificables (`vm:created`, `vm:updated` y `vm:deleted`).
- Evita duplicar un mismo cambio cuando coinciden la respuesta HTTP y el evento emitido por el servidor.
- Conserva la reversión optimista si la operación HTTP falla.

SEGURIDAD Y VALIDACIÓN
- Mantén el JWT en cookie HttpOnly; nunca lo devuelvas en el body ni lo guardes en localStorage o sessionStorage.
- Usa SameSite apropiado y Secure en producción. Permite Secure desactivado solo para desarrollo local sobre HTTP.
- Protege endpoints de lectura con autenticación y limita las mutaciones a Administrador en el servidor. Ocultar un botón en React no sustituye autorización.
- Almacena contraseñas con hash, valida payloads en el backend y no filtres secretos en errores.
- No incluyas secretos, bases de datos locales ni archivos de build en Git.

DIRECCIÓN VISUAL
- El resultado debe ser minimalista, profesional, intuitivo y transmitir elegancia sobria y calidad alta.
- Usa color, contraste, tipografía y espaciado para jerarquizar la información. Incluye tema oscuro y claro y diseño adaptable a móvil.
- Usa drawers para crear y editar. Añade transiciones breves, elegantes y funcionales que comuniquen acciones o cambios de estado.
- No uses glassmorphism. Evita efectos decorativos, brillos, animaciones excesivas y gradientes intensos. La legibilidad y la consistencia tienen prioridad.

ENTREGABLES Y CRITERIOS DE ACEPTACIÓN
- Deja un README con instalación, ejecución, variables de entorno y cuentas de prueba.
- Deja documentación técnica con arquitectura, decisiones y eventos Socket.IO, y un manual de uso por rol.
- Documenta herramienta, modelo y prompts de IA; distingue mensajes literales de reconstrucciones editoriales y describe las decisiones e intervenciones del candidato.
- Implementa en etapas pequeñas y explica qué requisito cubre cada etapa. Compila frontend y backend al terminar los cambios de código.
- Al informar el resultado, enumera lo implementado, cómo se verificó y qué sigue pendiente. No marques como completo un requisito parcial ni inventes una publicación de GitHub.
```

### Por qué este prompt establece el alcance

El prompt reúne los requisitos del producto y las decisiones técnicas para que la implementación sea evaluable, no solo visual. Precisa quién usa el sistema, qué operaciones corresponden a cada rol, qué datos tiene una VM, cómo se comportan las rutas y el estado, qué debe ocurrir ante fallos y cómo se autentica el tiempo real. También convierte preferencias de diseño y reglas de seguridad en criterios verificables.

## Prompt 2 — Dirección visual · consolidado

> **Fidelidad:** consolida las preferencias de diseño indicadas directamente por el candidato durante la conversación.

```text
Intervén en la presentación del dashboard para alinearla con esta dirección visual: minimalista, profesional, intuitiva, sobria y elegante, con sensación de producto de alta calidad. No uses glassmorphism. Usa colores discretos, jerarquía clara y drawers para crear y editar. Aplica transiciones profesionales, breves y elegantes a los cambios que deban llamar la atención. Cada elemento destacado debe ayudar a leer información o entender una acción; evita adornos sin función.
```

**Intervención y razón:** el candidato precisó una dirección visual concreta para evitar que la IA resolviera el dashboard con un estilo genérico o cargado. La solución debía expresar lujo sobrio sin sacrificar claridad, y usar transiciones y drawers como parte del flujo, no como decoración.

## Prompt 3 — Stack local y tiempo real desde el inicio · consolidado

> **Fidelidad:** reúne decisiones expresadas por el candidato al responder las preguntas iniciales de planeación.

```text
Implementa el frontend con React, TypeScript y Vite; la API con Express y TypeScript; persiste los datos en SQLite. Integra Socket.IO desde la primera versión. Autentica API y conexión de tiempo real con la sesión del usuario. Propaga creación, actualización y eliminación de VMs a las demás sesiones, mantén los roles validados en la API y evita duplicar datos al combinar respuesta HTTP y evento Socket.IO. Prepara el sistema para ejecutarse localmente.
```

**Intervención y razón:** el candidato eligió explícitamente SQLite y pidió planear WebSockets desde el inicio. Esta instrucción fija decisiones que afectan la arquitectura y evita tratar la sincronización como un añadido posterior.

## Prompt 4 — Documentación y cuentas de demostración · consolidado

> **Fidelidad:** consolida la petición del candidato de preparar cuentas de prueba documentadas, documentación técnica y manual de uso.

```text
Prepara los entregables para que otra persona pueda instalar y evaluar el sistema localmente. Documenta los comandos de inicio, configuración y variables de entorno; crea cuentas de demostración con roles distintos y explica cómo probar cada una. Incluye documentación técnica de arquitectura y decisiones, un manual de uso para Administrador y Cliente y una bitácora transparente que identifique la IA utilizada y los prompts, diferenciando textos literales de reconstrucciones.
```

**Intervención y razón:** el candidato pidió que los entregables acompañaran al código, y que las credenciales de prueba quedaran disponibles y explicadas en la documentación.

## Prompt 5 — Corrección dirigida por evaluación · reconstruido

> **Fidelidad:** reconstrucción del encargo de implementación que siguió a la evaluación compartida por el candidato. El reporte externo identificó problemas concretos y el candidato lo usó para dirigir una iteración.

```text
Corrige las brechas de frontend reportadas en la evaluación, manteniendo la dirección visual ya definida y sin rehacer las partes que cumplen.

1. Sustituye la navegación condicional por rutas reales: login pública; dashboard e inventario privados; creación y edición con rutas privadas dedicadas. Protege rutas por sesión y por rol, y conserva la autorización del backend.
2. Saca de App.tsx los componentes y responsabilidades que pertenecen a funcionalidades. Separa autenticación y VM, y utiliza un store global para los datos compartidos de sesión e inventario. Mantén en cada componente solo el estado local que le corresponde.
3. Cambia la validación del drawer para que los campos se validen al perder foco y se actualicen mientras el usuario corrige el valor. Conserva la validación completa al enviar y la validación autoritativa en el servidor.
4. Al recibir vm:updated por Socket.IO, actualiza el estado compartido y resalta temporalmente la fila de esa VM con una transición discreta. Respeta prefers-reduced-motion.
5. Revisa la deduplicación entre eventos y respuestas HTTP para que una operación no duplique una VM. Si la escritura falla, conserva la reversión optimista.
6. Actualiza README y documentación técnica para que describan las rutas, el store y la estructura realmente implementados. Amplía esta bitácora con esta intervención específica y el resultado; no atribuyas al candidato una transcripción literal inexistente.

Compila API y frontend y reporta las limitaciones que sigan pendientes.
```

**Intervención y razón:** el candidato compartió una evaluación que marcaba estas brechas como las de mayor impacto en la prueba. En lugar de aceptar una calificación general o rehacer la solución, dirigió una corrección específica hacia las capacidades que el enunciado evaluaba: arquitectura de rutas, organización del estado, validación y señal visual de eventos en tiempo real.

**Resultado de esta intervención:** se añadieron rutas React Router para `/login`, `/dashboard`, `/vms`, `/vms/new` y `/vms/:id/edit`; guards de sesión y rol; Zustand para sesión e inventario; componentes separados para login, filas, drawer y tarjetas; validación al salir y mientras se corrige cada campo; y resaltado temporal de filas actualizadas por Socket.IO. La API conserva la autorización de escritura.

## Prompt 6 — Auditoría independiente · Devin Desktop / Windsurf · SWE-2 High · reconstruido

> **Fidelidad:** reconstrucción del encargo de revisión asociado al reporte de Devin Desktop / Windsurf con SWE-2 High, compartido por el candidato. El agente de auditoría debía evaluar, no implementar.

```text
Actúa como auditor técnico independiente. Lee el enunciado completo y contrasta cada requisito funcional, de seguridad, UX y documentación con el código del proyecto. No edites los archivos auditados. Clasifica cada punto como cumplido, parcial o ausente y cita la evidencia concreta en el código. Ejecuta el build de frontend y backend y contrasta las afirmaciones de los documentos con el comportamiento real. Prioriza las brechas por impacto en la evaluación y entrega un veredicto honesto sobre la calidad arquitectónica, incluido el nivel de separación de componentes, rutas y estado global. No ocultes hallazgos para favorecer al agente de desarrollo; el candidato usará el informe para decidir y dirigir la siguiente corrección.
```

**Intervención y razón:** el candidato mantuvo separada la implementación de la evaluación y compartió el reporte para revisar el trabajo con otra perspectiva. La evaluación reportó, entre otros puntos, que faltaban rutas reales, estado global, validación en tiempo real y resaltado al actualizar por Socket.IO. Ese reporte se convirtió en tareas concretas mediante el Prompt 5.

## Git y estado de publicación

El candidato señaló inicialmente que no veía commits y pidió un nivel profesional de trazabilidad. Se inicializó el repositorio, se incorporaron `.editorconfig`, `.gitattributes`, `.gitignore` y `CONTRIBUTING.md`, y el proyecto se publicó en GitHub. La rama `main` incluye el commit `134d525` (`feat: add VM management dashboard with realtime API`). El remoto `origin` apunta a [github.com/Solrackf/ifx-vm-dashboard](https://github.com/Solrackf/ifx-vm-dashboard).

Una versión anterior de esta bitácora quedó desactualizada al afirmar que no existían commits ni remoto. Este registro corrige ese dato y refleja el estado publicado informado por el candidato y la referencia del repositorio configurada localmente.

## Verificación y responsabilidad de revisión

Después de la corrección guiada por la evaluación, `npm run build` completó la compilación de TypeScript de la API y del frontend y el bundle de Vite. Esto verifica la compilación, no reemplaza el recorrido funcional del candidato. Antes de presentar la entrega, el candidato revisará los flujos principales con las cuentas de demostración y confirmará que el comportamiento satisface el enunciado.
