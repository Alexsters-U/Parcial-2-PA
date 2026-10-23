# Enlace · Parcial 2 de Programación Avanzada

Aplicación full-stack para acortar URLs, conservarlas en MongoDB, redireccionarlas y consultar un historial con caché real de Redis durante **30 segundos**.

## Ejecutar en Windows con Docker

Requisito: Docker Desktop iniciado, con contenedores Linux y Docker Compose. La primera compilación descarga las imágenes y dependencias. Java, Maven y Node **no son necesarios en Windows para ejecutar la aplicación con Compose**.

Desde la carpeta `parcial_2_PA`, en PowerShell:

```powershell
docker compose up -d --build --wait --wait-timeout 180
```

También puedes ejecutar `./iniciar.ps1`, que realiza ese comando y abre el navegador.

- **Aplicación:** http://localhost:5173
- **API:** http://localhost:8085/api/links
- **Salud:** http://localhost:8085/actuator/health

Inicio, Acortar enlace y Ver enlaces son las tres opciones de navegación. El historial empieza vacío en una instalación nueva; las verificaciones crean registros reales identificados con `example.com`.

```powershell
docker compose ps
docker compose logs --tail 100 backend
docker compose stop
docker compose start
```

`docker compose down` retira los contenedores y conserva el volumen de MongoDB. **No añadas `-v` si quieres conservar tus enlaces**. Redis es temporal y puede reconstruirse desde MongoDB.

## Configuración

El proyecto funciona sin crear `.env`. Para cambiar los valores por defecto:

```powershell
Copy-Item .env.example .env
```

| Variable | Valor por defecto | Responsabilidad |
| --- | --- | --- |
| `WEB_PORT` | `5173` | Puerto de la aplicación en Windows |
| `API_PORT` | `8085` | Puerto del backend en Windows |
| `PUBLIC_BASE_URL` | `http://localhost:5173` | Base de los enlaces cortos que devuelve la API |
| `LINK_FACTORY` | `random` | Familia `random` de 8 caracteres o `hash` de 9 |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Orígenes permitidos, separados por comas |

Si cambias `WEB_PORT`, ajusta también `PUBLIC_BASE_URL` y `CORS_ALLOWED_ORIGINS`. El puerto interno de Spring Boot sigue siendo 8080. Las variables `MONGODB_URI`, `REDIS_HOST`, `REDIS_PORT` y `SERVER_PORT` permiten ejecutar el backend fuera de Docker; Compose ya proporciona las conexiones internas.

MongoDB y Redis **no publican puertos en Windows**: se consultan desde la red del proyecto o con `docker compose exec`. Esto evita interferir con el MongoDB local que ya está usando 27017. El proyecto Compose se llama `parcial_2_pa`.

## Tecnologías y organización

- Java 21, Spring Boot 3.5.16, Maven y JUnit/Mockito.
- MongoDB 8.0, índice único en `shortCode` y volumen persistente.
- Redis 7.4, serialización JSON, `SET` con expiración y lectura atómica `GET` + `PTTL` mediante Lua.
- React 19.3.1 con JavaScript, Vite 8.3.5 y CSS adaptable. SVG propios; sin fuentes ni imágenes remotas.
- Nginx sirve React y reenvía `/api/` y `/r/` a Spring Boot.

```text
parcial_2_PA/
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/
│       ├── main/java/co/edu/parcial/enlace/
│       │   ├── EnlaceApplication.java
│       │   ├── domain/                 # Entidad, objeto de valor y errores
│       │   │   └── generation/         # Abstract Factory y sus productos
│       │   ├── application/
│       │   │   ├── port/in/            # LinkUseCases
│       │   │   ├── port/out/           # LinkRepository y HistoryCache
│       │   │   └── service/            # Casos de uso, sin Spring
│       │   └── infrastructure/
│       │       ├── config/             # Composición de dependencias y CORS
│       │       ├── mongo/              # Documento y adaptador MongoDB
│       │       ├── redis/              # Adaptador Redis con TTL
│       │       └── web/                # DTO, REST y Problem Details
│       ├── main/resources/application.yaml
│       └── test/java/co/edu/parcial/enlace/
├── frontend/
│   ├── src/main.jsx                   # Navegación y estructura común
│   ├── src/api.js                     # Cliente HTTP
│   ├── src/pages/                     # Home, Shorten, History
│   ├── src/components/                # Iconos, copia y componentes comunes
│   ├── src/styles.css
│   ├── src/theme.css                    # Paletas de modo claro y oscuro
│   ├── src/components/ThemeSwitch.jsx  # Interruptor con preferencia persistente
│   ├── public/favicon.svg
│   ├── tests/app.spec.js              # Flujos reales con Playwright
│   ├── playwright.config.js
│   ├── vite.config.js
│   ├── nginx.conf
│   ├── package.json
│   └── package-lock.json
├── scripts/verify.mjs                 # Verificación HTTP + MongoDB + Redis
├── docs/
│   ├── REQUISITOS.md                  # Enunciado original
│   ├── ARQUITECTURA.md
│   ├── SUSTENTACION.md
│   ├── VALIDACION.md
│   └── capturas/
├── api.http
├── .env.example
├── iniciar.ps1
└── compose.yaml
```

La explicación técnica está en [ARQUITECTURA.md](docs/ARQUITECTURA.md), y el guion demostrable en [SUSTENTACION.md](docs/SUSTENTACION.md).

## API y ejemplos

| Método | Ruta | Resultado |
| --- | --- | --- |
| POST | `/api/links` | 201 y DTO del enlace, cabecera `Location` |
| GET | `/api/links` | 200 con `links`, `cacheStatus` y `remainingTtlMillis` |
| GET | `/api/links?source=mongo` | Lectura directa de MongoDB para la primera visita; `BYPASS`, sin caducidad visual |
| GET | `/r/{shortCode}` | 302 y `Location` hacia la URL original |
| GET | `/api/config` | Familia activa y TTL configurado |

**PowerShell:**

```powershell
$body = @{ originalUrl = 'https://example.com/ruta?desde=parcial' } | ConvertTo-Json
$enlace = Invoke-RestMethod -Method Post -Uri http://localhost:8085/api/links -ContentType 'application/json' -Body $body
$enlace
Invoke-RestMethod http://localhost:8085/api/links | ConvertTo-Json -Depth 5
Invoke-RestMethod http://localhost:8085/api/links | ConvertTo-Json -Depth 5
curl.exe -I $enlace.shortUrl
```

Las URLs vacías, sin host, con credenciales, con más de 8192 caracteres o con protocolos distintos de HTTP/HTTPS devuelven **400**. Los dominios internacionales deben enviarse en su representación ASCII/punycode; los caracteres Unicode de la ruta se codifican para redireccionar. Los códigos inexistentes devuelven **404**, agotar 16 candidatos devuelve **409**, y la indisponibilidad de los servicios de datos devuelve **503**. Los errores usan `ProblemDetail`; los documentos Mongo no son contratos HTTP.

Ejemplo de historial en un HIT:

```json
{
  "links": [],
  "cacheStatus": "HIT",
  "remainingTtlMillis": 22480
}
```

La primera entrada a **Ver enlaces** desde que se carga la aplicación solicita `source=mongo`: consulta directamente MongoDB, devuelve `cacheStatus: "BYPASS"` y `remainingTtlMillis: 0`, y muestra «Primera visita · Sin caducidad». El listado permanece sin contador mientras el usuario siga en ese módulo, incluso al pulsar Actualizar o volver a pulsar Ver enlaces. No consulta, rellena ni invalida Redis.

Al salir a otro módulo y regresar a Ver enlaces, la aplicación utiliza `/api/links` y activa el comportamiento de caché para todas las visitas siguientes. Si Redis está vacío, se consulta MongoDB y se prepara la entrada de 30 segundos; en HIT se conserva el TTL restante. El contador aparece con una sola consulta en ambos casos. Una recarga completa de la página inicia de nuevo esta secuencia de navegación; los documentos y el caché no se borran.

`22480` es ilustrativo: el valor real procede de `PTTL` en Redis. Tanto MISS como HIT devuelven `remainingTtlMillis`, para limitar la vida visual de la consulta después de esa primera visita. El texto de origen distingue MongoDB de Redis. Consultar un HIT no ejecuta `SET` ni renueva el TTL. El ejemplo no sustituye los datos reales.

Una vez activado el modo caché, al vencer el TTL React retira los enlaces de la vista, reduce el panel a un mensaje compacto y muestra «Caché expirado». No hace consultas automáticas: pulsa **Actualizar** o **Ver enlaces**, incluso estando ya en ese módulo, para volver a consultar. Si Redis ya expiró, se recupera MongoDB y se abre un nuevo ciclo de 30 segundos. Los registros permanentes y las redirecciones siguen disponibles en MongoDB.

El interruptor junto a «Un enlace. Menos distancia.» cambia entre modo claro y oscuro y guarda la elección en el navegador. Sigue visible en móvil. Los textos auxiliares tienen un mínimo de 11 px y los textos habituales de formularios y descripción, 14 px o más. Estos ajustes de presentación responden a las solicitudes posteriores al enunciado original.

## Pruebas reproducibles

**Backend:** cada compilación Docker ejecuta `mvn verify`. Para forzar su ejecución sin instalar Maven en Windows:

```powershell
docker build --target build -t parcial_2_pa-backend-tests backend
docker run --rm parcial_2_pa-backend-tests mvn -B test
```

**Integración:** requiere Node 22.12 o posterior en Windows y la aplicación iniciada. No necesita paquetes npm:

```powershell
node scripts/verify.mjs --restart
```

Verifica servicios reales, índices, solicitudes concurrentes, el ciclo completo de caché y persistencia tras reiniciar MongoDB y el backend de **este** Compose. Dura aproximadamente un minuto. Crea registros de prueba en MongoDB y vacía únicamente `enlace:history:v1`.

**Navegador:** instalar dependencias del frontend y ejecutar secuencialmente después de la integración, para que las pruebas de caché no interfieran entre sí:

```powershell
Set-Location frontend
npm ci
npm run test:e2e
```

En Windows utiliza el Microsoft Edge instalado. Para usar Chromium instalado por Playwright:

```powershell
npx playwright install chromium
$env:PLAYWRIGHT_CHANNEL = 'chromium'
npm run test:e2e
```

En Linux el valor por defecto es Chromium y debe instalarse con `npx playwright install --with-deps chromium`. Las pruebas guardan capturas en `docs/capturas/`. La API y los adaptadores no se simulan en los flujos normales; una prueba inyecta un 503 para revisar el mensaje de error y las páginas externas de destino se controlan para no depender de terceros.

## Desarrollo sin recompilar contenedores

Con el stack iniciado, puedes ejecutar React con recarga automática en otro puerto:

```powershell
Set-Location frontend
npm ci
npm run dev -- --port 5174
```

Abrir http://localhost:5174. Vite reenvía `/api` y `/r` a 8085. Los enlaces cortos seguirán usando `PUBLIC_BASE_URL`, por defecto la aplicación Nginx en 5173.

Para ejecutar Spring Boot directamente se requiere JDK 21 y Maven 3.6.3 o posterior, además de servicios MongoDB/Redis accesibles. Configura `MONGODB_URI`, `REDIS_HOST`, `REDIS_PORT`, `PUBLIC_BASE_URL` y ejecuta `mvn spring-boot:run` en `backend`. Los servicios Compose no se publican al host por defecto.

## Alcance y decisiones

Es un proyecto académico local funcional con **una instancia del backend**. Usa un monitor compartido para serializar creación y consulta del historial, evitando que una lectura anterior vuelva a poblar un caché desactualizado. Para múltiples réplicas se requeriría invalidación distribuida/versionada; el monitor Java no se comparte entre procesos. El fallo de Redis produce 503 en consultas del historial con caché y evita crear antes de tocar MongoDB. La primera visita directa a MongoDB y las redirecciones guardadas no necesitan Redis.

El historial devuelve todos los registros porque así lo exige el enunciado. No hay autenticación, eliminación, expiración de enlaces ni análisis de visitas; no fueron solicitados. Las pruebas realizadas se detallan en [VALIDACION.md](docs/VALIDACION.md).

Referencias primarias: [Spring Boot y Java](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [configuración MongoDB y Redis](https://docs.spring.io/spring-boot/3.5/reference/data/nosql.html), [efectos de React](https://react.dev/reference/react/useEffect), [PTTL de Redis](https://redis.io/docs/latest/commands/pttl/), [índices únicos MongoDB](https://www.mongodb.com/docs/manual/core/index-unique/).
