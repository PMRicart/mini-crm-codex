# Mini CRM de leads

Aplicación web ligera para registrar y administrar contactos potenciales (leads). Permite crear, consultar, buscar y filtrar leads por estado, editar y eliminar registros, navegar por el listado con paginación y descargar los datos como CSV. La interfaz estática y la API se sirven desde el mismo servidor.

Cada lead almacena identificador, nombre, email, empresa, fuente, estado y fecha de creación. Los estados disponibles son `nuevo`, `contactado` y `perdido`. La base de datos SQLite se guarda localmente en `data/leads.sqlite` y se crea automáticamente al iniciar la aplicación.

## Tecnologías

- **Node.js**: entorno de ejecución del servidor y módulos nativos para UUID y gestión de archivos.
- **Express 5**: servidor HTTP, API REST y entrega de archivos estáticos.
- **SQLite** con **better-sqlite3**: persistencia local de leads.
- **HTML5, CSS3 y JavaScript ES6+**: interfaz de usuario sin framework ni paso de compilación.
- **npm**: instalación de dependencias y ejecución de scripts.

## Requisitos

- Node.js y npm instalados. Utiliza una versión de Node.js compatible con `better-sqlite3` 13.
- En plataformas donde no haya un binario precompilado disponible, la instalación de `better-sqlite3` puede requerir herramientas de compilación nativas.

## Instalación

Clona o descarga el repositorio y abre una terminal en la carpeta raíz del proyecto. Instala las dependencias con:

```bash
npm install
```

## Ejecutar localmente

Para iniciar el servidor en modo desarrollo, con reinicio automático al cambiar archivos:

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. Para iniciar sin el modo de observación:

```bash
npm start
```

El puerto predeterminado es `3000`; puedes cambiarlo definiendo la variable de entorno `PORT`. La carpeta `data/` y el archivo SQLite se crean al arrancar. Los datos locales están excluidos del control de versiones mediante `.gitignore`.

## Estructura del proyecto

```text
mini-crm-codex/
├── public/
│   ├── app.js          # Lógica del navegador y consumo de la API
│   ├── index.html      # Estructura de la interfaz
│   └── styles.css      # Estilos y diseño adaptable
├── src/
│   ├── app.js          # Configuración de Express y rutas de la API
│   ├── lead-store.js   # Persistencia SQLite y migración opcional desde JSON
│   └── server.js       # Inicio del servidor
├── data/               # Datos locales creados al iniciar; ignorados por Git
├── package.json        # Dependencias y scripts npm
└── package-lock.json   # Versiones resueltas de las dependencias
```

La API incluye `GET /leads` para consultar, `POST /leads` para crear, `PATCH /leads/:id` para actualizar y `DELETE /leads/:id` para eliminar leads. `GET /leads/export.csv` descarga el listado en formato CSV.
