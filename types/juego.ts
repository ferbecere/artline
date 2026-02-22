// =============================================================================
// TIPOS DEL JUEGO - ARTLINE
// =============================================================================
// Este archivo es el "contrato" de datos de toda la aplicación.
// Tanto el servidor (Socket.io) como el cliente (React) usan estos mismos tipos.
// Eso es posible porque compartimos carpetas TypeScript en un monorepo Next.js.

// --- CARTA DE OBRA DE ARTE ---

// Tipo de obra para la codificación de color
export type TipoObra = 'pintura' | 'escultura' | 'otro';

export interface Carta {
  id: number;               // objectID de la Met API
  titulo: string;           // title
  artista: string;          // artistDisplayName
  anio: number;             // objectBeginDate (usamos este para la lógica del Timeline)
  anioTexto: string;        // objectDate (string legible: "ca. 1880", "1920s", etc.)
  imagen: string;           // primaryImageSmall
  tipo: TipoObra;           // derivado del departamento
  departamento: string;     // department original
  medio: string;            // medium
  dimensiones: string;      // dimensions
  cultura: string;          // culture
  pais: string;             // country
  descripcion: string;      // creditLine (usamos esto como descripción breve)
  urlObra: string;          // objectURL (enlace al museo)
}

// --- JUGADOR ---

export interface Jugador {
  socketId: string;
  nombre: string;
  mano: Carta[];            // Cartas en mano del jugador
  listaOrden: Carta[];     // Para verificar si mantiene orden localmente (solo servidor)
}

// --- ESTADO DE LA SALA Y EL JUEGO ---

export type FaseJuego = 'esperando' | 'jugando' | 'terminado';

export interface EstadoJuego {
  salaId: string;
  jugadores: Jugador[];
  tablero: Carta[];         // Cartas colocadas correctamente, en orden cronológico
  mazo: Carta[];            // Mazo restante (solo en servidor, no se envía al cliente)
  turnoActual: string;      // socketId del jugador con el turno
  fase: FaseJuego;
  ganador?: string;         // socketId del ganador
  mensajeUltimaJugada?: string; // "¡Correcto!" / "Incorrecto, -1 carta robada"
}

// Lo que el servidor SÍ envía al cliente (sin el mazo - ¡no queremos trampas!)
export interface EstadoJuegoCliente extends Omit<EstadoJuego, 'mazo'> {}

// --- EVENTOS DE SOCKET ---
// Centralizar los nombres de eventos evita errores de typo en strings.

export const EVENTOS = {
  // Cliente → Servidor
  CREAR_SALA: 'crearSala',
  UNIRSE_A_SALA: 'unirseASala',
  COLOCAR_CARTA: 'colocarCarta',
  
  // Servidor → Cliente
  SALA_CREADA: 'salaCreada',
  SALA_UNIDA: 'salaUnida',
  ESTADO_ACTUALIZADO: 'estadoActualizado',
  JUGADA_RESULTADO: 'jugadaResultado',
  ERROR_SALA: 'errorSala',
  JUGADOR_DESCONECTADO: 'jugadorDesconectado',
} as const;

// --- PAYLOADS DE EVENTOS ---

export interface PayloadCrearSala {
  nombre: string;
}

export interface PayloadUnirseASala {
  salaId: string;
  nombre: string;
}

export interface PayloadColocarCarta {
  cartaId: number;          // id de la carta que coloca
  posicion: number;         // índice en el tablero donde la inserta (0 = izquierda del todo)
}

export interface PayloadJugadaResultado {
  correcto: boolean;
  mensaje: string;
  cartaId: number;
}

// --- RESULTADO DE VERIFICACIÓN DE JUGADA ---

export interface ResultadoJugada {
  correcto: boolean;
  nuevoTablero?: Carta[];
  mensaje: string;
}
