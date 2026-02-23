// =============================================================================
// HOOK: useSocket
// =============================================================================
// Los hooks personalizados en React son funciones que empiezan por "use" y
// encapsulan lógica de estado y efectos. Este hook centraliza TODA la
// comunicación con el servidor Socket.io.
//
// Ventaja: los componentes de React no saben nada de sockets.
// Solo llaman funciones como "crearSala(nombre)" y reaccionan a cambios de estado.

'use client'; // Este hook solo funciona en el cliente (no en SSR de Next.js)

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Importamos los tipos (sin el campo mazo, que el servidor no envía)
export interface JugadorCliente {
  socketId: string;
  nombre: string;
  mano: any[];
  cartasEnMano: number;
}

export interface EstadoJuegoCliente {
  salaId: string;
  jugadores: JugadorCliente[];
  tablero: any[];
  turnoActual: string;
  fase: 'esperando' | 'jugando' | 'terminado';
  ganador?: string;
  mensajeUltimaJugada?: string;
}

export interface ResultadoJugada {
  correcto: boolean;
  mensaje: string;
  cartaId: number;
}

interface UseSocketReturn {
  // Estado de conexión
  conectado: boolean;
  miSocketId: string | null;
  
  // Estado del juego
  salaId: string | null;
  miNombre: string | null;
  estadoJuego: EstadoJuegoCliente | null;
  
  // Resultados y mensajes
  ultimoResultado: ResultadoJugada | null;
  error: string | null;
  
  // Acciones (lo que el jugador puede hacer)
  crearSala: (nombre: string) => void;
  unirseASala: (salaId: string, nombre: string) => void;
  colocarCarta: (cartaId: number, posicion: number) => void;
  limpiarError: () => void;
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  
  const [conectado, setConectado] = useState(false);
  const [miSocketId, setMiSocketId] = useState<string | null>(null);
  const [salaId, setSalaId] = useState<string | null>(null);
  const [miNombre, setMiNombre] = useState<string | null>(null);
  const [estadoJuego, setEstadoJuego] = useState<EstadoJuegoCliente | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoJugada | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Creamos la conexión Socket.io al montar el componente
    // La URL vacía significa "conectar al mismo servidor que sirve la web"
    const socket = io({
      path: '/socket.io',
    });

    socketRef.current = socket;

    // ---- MANEJADORES DE EVENTOS DEL SERVIDOR ----

    socket.on('connect', () => {
      setConectado(true);
      setMiSocketId(socket.id || null);
      console.log('[Socket] Conectado con ID:', socket.id);
    });

    socket.on('disconnect', () => {
      setConectado(false);
      setMiSocketId(null);
      console.log('[Socket] Desconectado');
    });

    socket.on('salaCreada', ({ salaId: id, nombre }) => {
      setSalaId(id);
      setMiNombre(nombre);
      console.log('[Sala] Sala creada:', id);
    });

    socket.on('salaUnida', ({ salaId: id, nombre }) => {
      setSalaId(id);
      setMiNombre(nombre);
      console.log('[Sala] Unido a sala:', id);
    });

    socket.on('juegoIniciado', ({ mensaje }) => {
      ('[Juego] Iniciado:', mensaje);
    });

    socket.on('estadoActualizado', (nuevoEstado: EstadoJuegoCliente) => {
      setEstadoJuego(nuevoEstado);
    });

    socket.on('jugadaResultado', (resultado: ResultadoJugada) => {
      setUltimoResultado(resultado);
      // Limpiamos el resultado después de 3 segundos
      setTimeout(() => setUltimoResultado(null), 3000);
    });

    socket.on('errorSala', ({ mensaje }) => {
      setError(mensaje);
    });

    socket.on('jugadorDesconectado', ({ mensaje }) => {
      setError(mensaje);
    });

    socket.on('juegoTerminado', ({ ganadorNombre, ganadorId }) => {
      console.log('[Juego] Terminado. Ganador:', ganadorNombre);
    });

    // Limpieza al desmontar el componente
    return () => {
      socket.disconnect();
    };
  }, []);

  // ---- ACCIONES ----
  // useCallback memoiza las funciones para evitar re-renders innecesarios

  const crearSala = useCallback((nombre: string) => {
    socketRef.current?.emit('crearSala', { nombre });
  }, []);

  const unirseASala = useCallback((id: string, nombre: string) => {
    socketRef.current?.emit('unirseASala', { salaId: id, nombre });
  }, []);

  const colocarCarta = useCallback((cartaId: number, posicion: number) => {
    socketRef.current?.emit('colocarCarta', { cartaId, posicion });
  }, []);

  const limpiarError = useCallback(() => {
    setError(null);
  }, []);

  return {
    conectado,
    miSocketId,
    salaId,
    miNombre,
    estadoJuego,
    ultimoResultado,
    error,
    crearSala,
    unirseASala,
    colocarCarta,
    limpiarError,
  };
}
