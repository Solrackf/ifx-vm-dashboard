# Manual de uso

## 1. Ingresar a la consola

Con el proyecto iniciado, abre [http://localhost:5173](http://localhost:5173). Puedes usar una de estas cuentas:

| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Administrador | `admin@ifx.test` | `Admin123!` |
| Cliente | `client@ifx.test` | `Client123!` |

La página de acceso también permite seleccionar cada perfil de demostración para completar el formulario automáticamente.

## 2. Revisar el dashboard

En **Resumen** puedes consultar:

- Cantidad de máquinas y cuántas están activas.
- Cores, RAM y disco sumados para las máquinas en ejecución.
- Barras de capacidad y estado general del sistema.
- Inventario de máquinas con nombre, estado, vCPU, memoria, almacenamiento y sistema operativo.

El punto verde de la barra superior indica la conexión en vivo. Los cambios de otras sesiones autenticadas se reflejan automáticamente.

## 3. Buscar y filtrar

En **Máquinas virtuales**, escribe parte del nombre, sistema operativo o identificador en el campo de búsqueda. Usa el selector para mostrar todas las máquinas, solo las que están en ejecución, apagadas o pausadas.

## 4. Administrar máquinas (Administrador)

1. Selecciona **Nueva máquina** para abrir el drawer de creación.
2. Ingresa nombre, vCPU, RAM, almacenamiento, sistema operativo y estado.
3. Los recursos deben ser positivos; el formulario muestra validaciones junto al campo correspondiente.
4. Selecciona **Crear máquina**. La fila aparece de inmediato mientras se guarda; si ocurre un error, se retira y aparece una notificación.
5. En el menú de una fila puedes editar detalles o eliminarla. Para borrar, confirma en el cuadro de diálogo.

Al editar o eliminar, la interfaz refleja el cambio enseguida. Si la API responde con error, restaura el dato y muestra la causa.

## 5. Usar el perfil Cliente

El Cliente puede consultar, buscar y filtrar máquinas. Los controles de creación, edición y eliminación no aparecen en pantalla. El servidor también bloquea cualquier mutación sin permisos de Administrador.

## 6. Tema y cierre de sesión

Usa el icono de sol/luna en la barra superior para cambiar entre tema oscuro y claro. Selecciona tu perfil en la esquina superior derecha para cerrar la sesión.

## 7. Reiniciar los datos de demostración

Detén la aplicación y elimina `apps/api/data/vms.sqlite` junto con sus archivos auxiliares `-shm` y `-wal` si existen. Al volver a iniciar, se recrearán las dos cuentas y las cinco VMs iniciales. Esto elimina todos los cambios locales guardados en esa base.
