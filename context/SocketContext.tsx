'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// --- Tipos ---

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

interface SocketContextValue {
  conectado: boolean;
  miSocketId: string | null;
  salaId: string | null;
  miNombre: string | null;
  estadoJuego: EstadoJuegoCliente | null;
  ultimoResultado: ResultadoJugada | null;
  error: string | null;
  crearSala: (nombre: string) => void;
  unirseASala: (salaId: string, nombre: string) => void;
  colocarCarta: (cartaId: number, posicion: number) => void;
  limpiarError: () => void;
  // Nueva función: limpia todo el estado de la partida anterior
  // para poder empezar una nueva sin residuos en el Context
  resetearSala: () => void;
  rendirse: () => void;
  esCreador: boolean;
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);

  const [conectado, setConectado] = useState(false);
  const [miSocketId, setMiSocketId] = useState<string | null>(null);
  const [salaId, setSalaId] = useState<string | null>(null);
  const [miNombre, setMiNombre] = useState<string | null>(null);
  const [estadoJuego, setEstadoJuego] = useState<EstadoJuegoCliente | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoJugada | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [esCreador, setEsCreador] = useState(false);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConectado(true);
      setMiSocketId(socket.id ?? null);
    });

    socket.on('disconnect', () => {
      setConectado(false);
      setMiSocketId(null);
    });

    socket.on('salaCreada', ({ salaId: id, nombre }) => {
      setSalaId(id);
      setMiNombre(nombre);
    });

    socket.on('salaUnida', ({ salaId: id, nombre }) => {
      setSalaId(id);
      setMiNombre(nombre);
    });

    socket.on('estadoActualizado', (nuevoEstado: EstadoJuegoCliente) => {
      setEstadoJuego(nuevoEstado);
    });

    socket.on('jugadaResultado', (resultado: ResultadoJugada) => {
      setUltimoResultado(resultado);
      setTimeout(() => setUltimoResultado(null), 3000);
    });

    socket.on('errorSala', ({ mensaje }: { mensaje: string }) => {
      setError(mensaje);
    });

    socket.on('jugadorDesconectado', () => {
      // Notificamos via estadoJuego con una fase especial para que la página lo gestione
      setEstadoJuego((prev: any) => prev ? { ...prev, fase: 'terminado', ganador: socketRef.current?.id, porAbandono: true } : prev);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const crearSala = useCallback((nombre: string) => {
    setEsCreador(true);
    socketRef.current?.emit('crearSala', { nombre });
  }, []);

  const unirseASala = useCallback((id: string, nombre: string) => {
    setEsCreador(false);
    socketRef.current?.emit('unirseASala', { salaId: id, nombre });
  }, []);

  const colocarCarta = useCallback((cartaId: number, posicion: number) => {
    socketRef.current?.emit('colocarCarta', { cartaId, posicion });
  }, []);

  const limpiarError = useCallback(() => setError(null), []);

  // Resetea todo el estado de partida — se llama antes de volver al inicio
  const rendirse = useCallback(() => {
    socketRef.current?.emit('rendirse');
  }, []);

  const resetearSala = useCallback(() => {
    setSalaId(null);
    setEsCreador(false);
    setEstadoJuego(null);
    setUltimoResultado(null);
    setError(null);
    // El nombre lo conservamos: es cómodo no tener que reescribirlo
  }, []);

  return (
    <SocketContext.Provider value={{
      conectado, miSocketId, salaId, miNombre,
      estadoJuego, ultimoResultado, error,
      crearSala, unirseASala, colocarCarta, limpiarError, resetearSala, rendirse, esCreador,
      socket: socketRef.current,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket debe usarse dentro de <SocketProvider>');
  return ctx;
}
