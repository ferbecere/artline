// =============================================================================
// LÓGICA DEL JUEGO - ARTLINE (Timeline de Arte)
// =============================================================================
// Esta lógica es PURA: no depende de sockets, React ni bases de datos.
// Recibe datos y devuelve nuevos datos. Esto facilita:
// - Testing: podemos probarla sin simular nada
// - Reutilización: funciona en servidor y cliente
// - Claridad: es fácil entender las reglas del juego leyendo este archivo

import { Carta, EstadoJuego, Jugador, ResultadoJugada } from '../types/juego';

// Cartas que se reparten al inicio a cada jugador
export const CARTAS_INICIALES = 4;

// Mínimo de cartas en el mazo para empezar
export const MIN_CARTAS_MAZO = 20;

// ---- VERIFICACIÓN DE JUGADA ----

/**
 * Verifica si una carta puede colocarse en una posición del tablero.
 * 
 * El tablero es un array de cartas ordenadas cronológicamente de izquierda a derecha.
 * La posición es el ÍNDICE donde se insertaría la nueva carta.
 * 
 * Ejemplo: tablero = [1500, 1750, 1900], carta.anio = 1800, posicion = 2
 * → ¿Es 1800 > 1750 Y 1800 < 1900? Sí → Correcto
 * 
 * Casos especiales:
 * - Posición 0: la carta debe ser anterior a la primera (o igual, empate = correcto)
 * - Posición = tablero.length: la carta debe ser posterior a la última
 * 
 * NOTA PEDAGÓGICA: Usamos <= y >= para el caso de empate en años
 * (dos obras del mismo año → cualquier orden es válido)
 */
export function verificarJugada(
  carta: Carta,
  tablero: Carta[],
  posicion: number
): ResultadoJugada {
  if (tablero.length === 0) {
    // El tablero está vacío, cualquier posición es válida
    return { correcto: true, mensaje: '¡Primera carta colocada!' };
  }

  const anterior = tablero[posicion - 1]; // puede ser undefined
  const siguiente = tablero[posicion];    // puede ser undefined

  const valida_con_anterior = !anterior || carta.anio >= anterior.anio;
  const valida_con_siguiente = !siguiente || carta.anio <= siguiente.anio;

  if (valida_con_anterior && valida_con_siguiente) {
    const nuevoTablero = [...tablero];
    nuevoTablero.splice(posicion, 0, carta);
    return {
      correcto: true,
      nuevoTablero,
      mensaje: `¡Correcto! "${carta.titulo}" — ${carta.anioTexto}`,
    };
  }

  return {
    correcto: false,
    mensaje: `Incorrecto. "${carta.titulo}" no va ahí. Robas una carta.`,
  };
}

// ---- INICIALIZACIÓN ----

/**
 * Crea el estado inicial del juego a partir de las cartas cargadas
 * de la Met API. Esta función la llama el servidor cuando los dos
 * jugadores ya están en la sala.
 */
export function inicializarJuego(
  salaId: string,
  jugadores: Array<{ socketId: string; nombre: string }>,
  todasLasCartas: Carta[]
): EstadoJuego {
  // Necesitamos: CARTAS_INICIALES × 2 jugadores + 1 carta central + mazo restante
  const totalNecesario = CARTAS_INICIALES * jugadores.length + 1;
  
  if (todasLasCartas.length < totalNecesario) {
    throw new Error(`Se necesitan al menos ${totalNecesario} cartas para iniciar`);
  }

  // Mezclamos las cartas
  const cartasMezcladas = [...todasLasCartas].sort(() => Math.random() - 0.5);

  // Repartimos la mano inicial a cada jugador
  const jugadoresConMano: Jugador[] = jugadores.map((j, i) => ({
    ...j,
    mano: cartasMezcladas.splice(0, CARTAS_INICIALES),
    listaOrden: [], // solo para uso interno del servidor
  }));

  // La siguiente carta va al centro del tablero (punto de partida del Timeline)
  const cartaCentral = cartasMezcladas.splice(0, 1);

  // El resto forma el mazo
  const mazo = cartasMezcladas;

  // El primero en jugar se elige aleatoriamente
  const turnoInicial = jugadoresConMano[Math.floor(Math.random() * jugadoresConMano.length)].socketId;

  return {
    salaId,
    jugadores: jugadoresConMano,
    tablero: cartaCentral,
    mazo,
    turnoActual: turnoInicial,
    fase: 'jugando',
    mensajeUltimaJugada: '¡El juego ha comenzado! Coloca tus obras en orden cronológico.',
  };
}

// ---- APLICAR JUGADA ----

/**
 * Aplica una jugada al estado del juego y devuelve el nuevo estado.
 * Esta función es el corazón del juego.
 * 
 * Inmutabilidad: creamos SIEMPRE un nuevo objeto de estado, nunca mutamos
 * el estado existente. Esto es una buena práctica en React y hace el
 * código más predecible.
 */
export function aplicarJugada(
  estado: EstadoJuego,
  socketIdJugador: string,
  cartaId: number,
  posicion: number
): { nuevoEstado: EstadoJuego; resultado: ResultadoJugada } {
  // Verificaciones de seguridad
  if (estado.fase !== 'jugando') {
    throw new Error('El juego no está en curso');
  }
  if (estado.turnoActual !== socketIdJugador) {
    throw new Error('No es tu turno');
  }

  // Encontramos al jugador y la carta
  const jugadorIndex = estado.jugadores.findIndex(j => j.socketId === socketIdJugador);
  if (jugadorIndex === -1) throw new Error('Jugador no encontrado');

  const jugador = estado.jugadores[jugadorIndex];
  const cartaIndex = jugador.mano.findIndex(c => c.id === cartaId);
  if (cartaIndex === -1) throw new Error('Carta no encontrada en tu mano');

  const carta = jugador.mano[cartaIndex];

  // Verificamos si la jugada es correcta
  const resultado = verificarJugada(carta, estado.tablero, posicion);

  // Copiamos el estado de forma inmutable
  const nuevosJugadores = estado.jugadores.map(j => ({ ...j, mano: [...j.mano] }));
  const jugadorActualizado = nuevosJugadores[jugadorIndex];

  if (resultado.correcto) {
    // Carta sale de la mano
    jugadorActualizado.mano.splice(cartaIndex, 1);
  } else {
    // Carta vuelve a la mano (ya estaba, no hacemos nada con ella)
    // Pero el jugador roba una carta extra del mazo
    const nuevoMazo = [...estado.mazo];
    if (nuevoMazo.length > 0) {
      const cartaRobada = nuevoMazo.splice(0, 1)[0];
      jugadorActualizado.mano.push(cartaRobada);
      estado = { ...estado, mazo: nuevoMazo };
    }
  }

  // Comprobamos si alguien ganó
  const ganador = nuevosJugadores.find(j => j.mano.length === 0);

  // Calculamos el siguiente turno (alternamos)
  const siguienteTurnoIndex = (jugadorIndex + 1) % nuevosJugadores.length;
  const siguienteTurnoId = nuevosJugadores[siguienteTurnoIndex].socketId;

  const nuevoEstado: EstadoJuego = {
    ...estado,
    jugadores: nuevosJugadores,
    tablero: resultado.nuevoTablero || estado.tablero,
    turnoActual: ganador ? estado.turnoActual : siguienteTurnoId,
    fase: ganador ? 'terminado' : 'jugando',
    ganador: ganador?.socketId,
    mensajeUltimaJugada: resultado.mensaje,
  };

  return { nuevoEstado, resultado };
}

// ---- UTILIDADES ----

/**
 * Devuelve la versión del estado que puede enviarse al cliente:
 * sin el mazo (¡evitamos trampas!) y con las manos ocultas de otros jugadores
 * según quién pregunte.
 * 
 * IMPORTANTE: Cada jugador solo ve su propia mano.
 * La mano del rival solo se muestra como un número (la longitud).
 */
export function estadoParaCliente(estado: EstadoJuego, socketIdSolicitante: string) {
  const { mazo, ...sinMazo } = estado;
  
  return {
    ...sinMazo,
    jugadores: estado.jugadores.map(j => ({
      socketId: j.socketId,
      nombre: j.nombre,
      // Si soy yo, veo mis cartas; si es el rival, solo veo cuántas tiene
      mano: j.socketId === socketIdSolicitante ? j.mano : [],
      cartasEnMano: j.mano.length, // este campo siempre está disponible
    })),
  };
}
