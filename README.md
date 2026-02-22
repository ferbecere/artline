# ArtLine 🎨

**El Timeline del Arte** — Juego multijugador con obras del Metropolitan Museum of Art.

Ordena obras de arte por orden cronológico antes que tu rival.  
Primera persona en vaciar su mano, gana.

---

## Instalación y arranque

```bash
# 1. Instalar dependencias
npm install

# 2. Arrancar en desarrollo
npm run dev

# La app corre en http://localhost:3000
```

> **Nota**: En desarrollo, el servidor hace peticiones reales a la Met API.
> La primera partida puede tardar unos segundos en cargar las 45 cartas.

---

## Cómo jugar

1. **Crea una sala** — Te dará un código de 6 letras
2. **Comparte el código** con tu rival
3. **Tu rival se une** introduciendo el código
4. El juego carga obras de arte del Metropolitan Museum
5. Cada jugador recibe **4 cartas** con obras de arte
6. Una carta queda en el centro como **punto de partida**

### Turno de juego:
- **Selecciona** una carta de tu mano (clic)
- **Coloca** la carta en la posición correcta del Timeline (clic en la zona de inserción ↓)
- Si la colocas en el **año correcto**: la carta queda en el tablero ✓
- Si te equivocas: la carta vuelve a tu mano y **robas una carta extra** ✗
- **Gana el primero en quedarse sin cartas**

### Ver detalles:
- **Hover** sobre una carta para verla ampliada
- **Clic derecho** sobre cualquier carta para abrir el panel de detalles (técnica, dimensiones, etc.)

---

## Arquitectura

```
artline/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Pantalla de inicio
│   ├── page.module.css
│   ├── globals.css               # Variables CSS globales (paleta, tipografía)
│   ├── layout.tsx
│   └── sala/[salaId]/
│       ├── page.tsx              # Tablero de juego
│       └── page.module.css
│
├── components/
│   ├── Carta/                    # Tarjeta de obra de arte
│   ├── Tablero/                  # Línea de tiempo central
│   ├── Mano/                     # Cartas del jugador (zona inferior)
│   ├── InfoJugador/              # Barra del rival (zona superior)
│   └── PanelDetalle/             # Panel lateral con detalles de obra
│
├── hooks/
│   └── useSocket.ts              # Hook que encapsula toda la comunicación Socket.io
│
├── lib/
│   ├── metApi.ts                 # Wrapper de la Metropolitan Museum API
│   └── logicaJuego.ts           # Lógica pura del juego (verificación, estados)
│
├── server/
│   └── index.mjs                 # Servidor Socket.io + Next.js custom server
│
└── types/
    └── juego.ts                  # Tipos TypeScript compartidos
```

### Conceptos clave

**¿Por qué un servidor custom?**  
Socket.io necesita conexiones WebSocket persistentes. Las API Routes de Next.js son "serverless" (viven y mueren en cada petición). Por eso usamos `server/index.mjs` que arranca un servidor Node.js que hace ambas cosas: servir Next.js Y gestionar sockets.

**¿Dónde vive el estado del juego?**  
En el servidor (en memoria, con un `Map`). El cliente solo recibe la versión del estado que le corresponde (sin el mazo, sin las cartas del rival). Esto es fundamental para evitar trampas.

**¿Cómo se evitan las trampas?**  
La función `estadoParaCliente()` en `logicaJuego.ts` filtra el estado antes de enviarlo: el mazo nunca sale del servidor, y las cartas del rival se envían vacías (solo se envía el número de cartas que tiene).

**Lógica pura**  
`logicaJuego.ts` es código que no depende de nada externo. Puede ejecutarse en el servidor o en el cliente. Puede testearse fácilmente con Jest sin necesidad de simular sockets o la API. Esta separación es una buena práctica que se llama "arquitectura hexagonal" o simplemente "separación de responsabilidades".

---

## Paleta de colores (inspirada en Metacritic)

| Color | Uso | Hex |
|-------|-----|-----|
| Verde | Pinturas | `#66cc00` |
| Amarillo | Esculturas | `#ffcc00` |
| Rojo | Otras obras | `#ff3400` |
| Gris oscuro | Fondo | `#1a1a1a` |

---

## Mejoras planeadas

- [ ] Minimapa de origen en el panel de detalles (Leaflet/Mapbox)
- [ ] Sistema de puntuación y historial
- [ ] Modo espectador
- [ ] Más de 2 jugadores
- [ ] Filtros por época o tipo de obra
- [ ] Modo offline vs CPU

---

## API utilizada

[Metropolitan Museum of Art Collection API](https://metmuseum.github.io/) — Completamente pública y gratuita. Sin autenticación. Más de 470.000 obras con dominio público.
