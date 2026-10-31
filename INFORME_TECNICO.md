# Informe técnico: Mini CRM de leads

## 1. Descripción general

Mini CRM es una aplicación web sencilla para registrar y administrar contactos potenciales (leads). Permite crear leads, consultar el listado, buscar por nombre o correo, filtrar por estado, paginar los resultados, editar registros y eliminarlos. El navegador consume una API HTTP implementada en el mismo servidor que sirve la interfaz.

Cada lead contiene `id`, `name`, `email`, `company`, `source`, `status` y `createdAt`. Los estados admitidos por la API son `nuevo`, `contactado` y `perdido`. La interfaz solicita nombre y email; la compañía forma parte del modelo y la API, aunque el formulario actual no permite introducirla.

## 2. Estructura del proyecto

```text
mini-crm-codex/
├── .gitignore
├── package.json
├── package-lock.json
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── src/
│   ├── server.js
│   ├── app.js
│   └── lead-store.js
└── data/                     # Se crea al iniciar; ignorada por Git
    ├── leads.sqlite         # Base SQLite local
    └── leads.json           # Archivo legado opcional para migración
```

`node_modules/` contiene dependencias instaladas y está excluido de Git. En el inventario actual no hay README ni suite de pruebas. Los archivos dentro de `data/` existen en el entorno local, pero `.gitignore` excluye toda esa carpeta y los archivos de base de datos, por lo que no se incluyen al compartir el código mediante Git.

## 3. Responsabilidad de los archivos principales del proyecto

- **`package.json`**: metadatos del paquete, punto de entrada, comandos (`npm start`, `npm run dev`) y dependencias directas: Express y `better-sqlite3`.
- **`package-lock.json`**: fija el árbol de dependencias resuelto para instalaciones reproducibles con npm.
- **`.gitignore`**: excluye dependencias, logs, secretos locales y datos/base de datos locales.
- **`src/server.js`**: arranca la aplicación Express en `PORT` o, por defecto, en el puerto 3000.
- **`src/app.js`**: configura Express, parseo JSON y archivos estáticos; declara rutas CRUD, valida la entrada y transforma errores en respuestas HTTP.
- **`src/lead-store.js`**: crea/abre SQLite, define la tabla, migra datos JSON heredados una vez y encapsula consultas de lectura, inserción, actualización y borrado.
- **`public/index.html`**: estructura semántica de la página, formulario, filtros, tabla y controles de paginación; carga CSS y JavaScript del cliente.
- **`public/app.js`**: estado y comportamiento del navegador; llama la API con `fetch`, renderiza filas de forma segura mediante nodos DOM, gestiona el formulario de alta/edición, búsqueda, filtro, paginación y borrado.
- **`public/styles.css`**: estilos visuales, diseño adaptable a pantallas pequeñas, estados de interacción y preferencia de movimiento reducido.

## 4. Flujo de creación de un lead: interfaz a base de datos

1. Al cargar la página, `public/app.js` ejecuta `loadLeads()`, que solicita `GET /leads`. Este paso no forma parte del alta, pero carga el listado inicial desde SQLite.
2. El usuario completa nombre y email (requeridos por HTML), y opcionalmente la fuente y el estado. Al enviar, el listener del formulario evita el envío HTML tradicional, desactiva el botón y prepara un objeto JSON con los valores recortados.
3. El navegador envía `POST /leads` con `Content-Type: application/json` y el objeto en el cuerpo. La ruta `express.json()` instalada en `src/app.js` convierte ese cuerpo a `req.body`.
4. La ruta comprueba que nombre y email sean cadenas no vacías, y que el estado, si se proporcionó, esté en la lista permitida. Los campos opcionales no textuales se sustituyen por cadena vacía. Genera un UUID mediante `node:crypto`, asigna `nuevo` si no se indicó estado y crea la fecha ISO.
5. La ruta llama a `createLead(lead)` en `src/lead-store.js`. El módulo utiliza una sentencia preparada `INSERT` con parámetros (`?`), evitando concatenar los datos del usuario en SQL.
6. `better-sqlite3` inserta el registro en la tabla `leads` del archivo `data/leads.sqlite`. Si todo va bien, la API devuelve HTTP 201 y el lead creado como JSON; si falla la persistencia, devuelve HTTP 500 con un mensaje genérico y registra el detalle en el servidor.
7. El frontend interpreta la respuesta. En caso de éxito, limpia el formulario, muestra confirmación y recarga `GET /leads`; como el listado se ordena por fecha descendente, el contacto nuevo aparece primero. En caso de respuesta fallida o problema de conexión, muestra el mensaje y rehabilita el botón.

### Rutas de API observadas

| Método | Ruta | Función |
|---|---|---|
| `GET` | `/` | Mensaje de estado básico de la API. |
| `GET` | `/leads` | Devuelve todos los leads, ordenados por fecha descendente. |
| `POST` | `/leads` | Valida y crea un lead. |
| `PATCH` | `/leads/:id` | Actualiza los campos permitidos; responde 404 si no existe. |
| `DELETE` | `/leads/:id` | Elimina por ID; responde 204 o 404. |

## 5. Tecnologías utilizadas

- **Node.js** y módulos nativos: `node:crypto` para UUID, `node:path` para rutas y `node:fs` para directorio/migración.
- **Express 5**: servidor HTTP, middleware JSON, archivos estáticos y endpoints REST.
- **SQLite**, a través de **`better-sqlite3`**: base de datos SQL embebida y acceso síncrono desde Node.
- **HTML5, CSS3 y JavaScript ES6+ sin framework**: interfaz cliente. No se observa React, TypeScript, proceso de compilación ni bundler configurado.
- **npm**: gestión de dependencias y scripts.
- **Google Fonts (DM Sans)**: tipografía externa importada desde CSS; requiere conexión para cargarse desde esa URL.

## 6. Mejoras y ampliaciones posibles

### Robustez y datos

- Validar formato y longitud del email y límites de longitud de todos los campos en el servidor; considerar unicidad del email si el modelo de negocio lo requiere.
- Definir una política de migraciones versionadas. La migración JSON actual solo se ejecuta cuando la tabla está vacía; un JSON inválido o un ID duplicado puede interrumpir la inicialización.
- Añadir índices según las consultas futuras; para el volumen actual, el listado se lee completo y búsqueda, filtro y paginación se hacen en el navegador.
- Si se prevé concurrencia alta, varios procesos o despliegue con almacenamiento efímero, evaluar una base de datos gestionada como PostgreSQL y una capa de persistencia desacoplada.
- Incluir datos de inicialización reproducibles o instrucciones para restaurar/importar datos: la carpeta `data/` no se versiona.

### API y seguridad

- Añadir autenticación/autorización, limitación de peticiones, configuración explícita de CORS si la API se separa del frontend, y cabeceras de seguridad antes de exponerla públicamente.
- Añadir límites al tamaño del JSON y validación con esquemas compartidos/documentados para evitar divergencias entre cliente y servidor.
- Normalizar respuestas y errores, y usar logging estructurado con niveles y contexto de petición.
- Incorporar documentación OpenAPI para que otros clientes puedan integrar la API.

### Experiencia de usuario y operación

- Mostrar también compañía en el formulario y en la tabla, ya que el backend ya almacena ese dato.
- Mover búsqueda, filtro y paginación al servidor si el volumen crece, mediante parámetros de consulta y límites explícitos.
- Añadir confirmación de borrado, ordenación de columnas y mejor recuperación/reintento ante errores de red.
- Añadir pruebas unitarias para validación y almacenamiento, y pruebas de integración para las rutas; automatizar formato/lint y ejecución en CI.
- Preparar configuración de despliegue, variables de entorno, copias de seguridad de SQLite y observabilidad; revisar compatibilidad de `better-sqlite3` con el runtime objetivo.

## Puesta en marcha

Requiere una versión de Node compatible con las dependencias instaladas. Desde la raíz del repositorio:

```bash
npm install
npm run dev
```

La aplicación queda disponible normalmente en `http://localhost:3000`. Para ejecutar sin recarga automática: `npm start`. El archivo SQLite y la carpeta `data/` se crean al arrancar el módulo de almacenamiento.
