// =============================================================================
// SERVIDOR CUSTOM - Socket.io + Next.js
// =============================================================================
// 
// ¿Por qué un servidor custom y no las API Routes de Next.js?
// ---------------------------------------------------------
// Las API Routes de Next.js son "serverless" — se ejecutan una vez,
// responden y mueren. Socket.io necesita una conexión PERSISTENTE entre
// cliente y servidor (un canal abierto). Por eso necesitamos un servidor
// Node.js "clásico" que viva continuamente.
//
// Este archivo hace dos cosas:
// 1. Sirve la app de Next.js (como haría `next start`)
// 2. Ata un servidor Socket.io al mismo puerto HTTP
//
// Ejecutar con: node server/index.mjs

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server, type Server as IOServer } from 'socket.io';
import { inicializarJuego, aplicarJugada, estadoParaCliente } from '../lib/logicaJuego';
import { obtenerCartasAleatorias } from '../lib/metApi';

const dev = process.env.NODE_ENV !== 'production';
// En producción (Railway) escuchamos en todas las interfaces (0.0.0.0)
// En desarrollo usamos localhost
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Preparamos la aplicación Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// ---- ESTADO EN MEMORIA DEL SERVIDOR ----
// En un juego de producción usaríamos Redis para poder escalar horizontalmente.
// Para este proyecto, un Map en memoria es perfectamente válido.

// Map<salaId, EstadoJuego>
const salas = new Map();

// Map<socketId, salaId> — para saber a qué sala pertenece cada socket
const socketASala = new Map();

// ---- UTILIDADES ----

function generarIdSala() {
  // Generamos un código de sala de 6 caracteres fácil de compartir
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin caracteres confusos (0/O, 1/I)
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function broadcastEstado(io: IOServer, salaId: string) {
  const sala = salas.get(salaId);
  if (!sala) return;
  
  // Enviamos a cada jugador su versión personalizada del estado
  sala.jugadores.forEach(jugador => {
    const socketId = jugador.socketId;
    const estadoPersonalizado = estadoParaCliente(sala, socketId);
    io.to(socketId).emit('estadoActualizado', estadoPersonalizado);
  });
}

// ---- INICIALIZACIÓN ----

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Creamos el servidor Socket.io adjunto al servidor HTTP
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? '*' : process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  // ============================================================
  // MANEJADORES DE EVENTOS SOCKET.IO
  // ============================================================
  
  io.on('connection', (socket) => {
    console.log(`[Socket] Conectado: ${socket.id}`);

    // ----------------------------------------------------------
    // CREAR SALA
    // ----------------------------------------------------------
    socket.on('crearSala', async ({ nombre }) => {
      if (!nombre || nombre.trim().length === 0) {
        socket.emit('errorSala', { mensaje: 'El nombre no puede estar vacío' });
        return;
      }

      const salaId = generarIdSala();
      
      // Estado provisional de la sala (esperando segundo jugador)
      salas.set(salaId, {
        salaId,
        jugadores: [{ socketId: socket.id, nombre: nombre.trim(), mano: [], listaOrden: [] }],
        tablero: [],
        mazo: [],
        turnoActual: '',
        fase: 'esperando',
      });
      
      socketASala.set(socket.id, salaId);
      socket.join(salaId);
      
      socket.emit('salaCreada', { salaId, nombre: nombre.trim() });
      console.log(`[Sala] ${nombre} creó la sala ${salaId}`);
    });

    // ----------------------------------------------------------
    // UNIRSE A SALA
    // ----------------------------------------------------------
    socket.on('unirseASala', async ({ salaId, nombre }) => {
      const codigoNormalizado = salaId.toUpperCase().trim();
      const sala = salas.get(codigoNormalizado);

      if (!sala) {
        socket.emit('errorSala', { mensaje: `La sala ${codigoNormalizado} no existe` });
        return;
      }
      if (sala.jugadores.length >= 2) {
        socket.emit('errorSala', { mensaje: 'La sala ya está llena' });
        return;
      }
      if (sala.fase !== 'esperando') {
        socket.emit('errorSala', { mensaje: 'El juego ya ha comenzado' });
        return;
      }

      // Añadimos el segundo jugador
      sala.jugadores.push({ socketId: socket.id, nombre: nombre.trim(), mano: [], listaOrden: [] });
      socketASala.set(socket.id, codigoNormalizado);
      socket.join(codigoNormalizado);

      socket.emit('salaUnida', { salaId: codigoNormalizado, nombre: nombre.trim() });
      
      console.log(`[Sala] ${nombre} se unió a la sala ${codigoNormalizado}. Iniciando juego...`);

      // Ya tenemos 2 jugadores → iniciamos el juego
      try {
        console.log(`[MetAPI] Cargando cartas para sala ${codigoNormalizado}...`);
        
        // Cargamos suficientes cartas: manos iniciales + mazo generoso
        // 4 cartas × 2 jugadores + 1 central + 30 en mazo = 39 cartas mínimo
        const cartas = await obtenerCartasAleatorias(45);
        
        const estadoInicial = inicializarJuego(
          codigoNormalizado,
          sala.jugadores,
          cartas
        );
        
        salas.set(codigoNormalizado, estadoInicial);
        
        // Notificamos el inicio a ambos jugadores
        io.to(codigoNormalizado).emit('juegoIniciado', {
          mensaje: '¡El juego ha comenzado!',
        });
        
        broadcastEstado(io, codigoNormalizado);
      } catch (err) {
        console.error('[Juego] Error iniciando juego:', err);
        io.to(codigoNormalizado).emit('errorSala', {
          mensaje: 'Error cargando obras de arte. Intenta de nuevo.',
        });
      }
    });

    // ----------------------------------------------------------
    // COLOCAR CARTA
    // ----------------------------------------------------------
    socket.on('colocarCarta', ({ cartaId, posicion }) => {
      const salaId = socketASala.get(socket.id);
      if (!salaId) {
        socket.emit('errorSala', { mensaje: 'No estás en ninguna sala' });
        return;
      }

      const sala = salas.get(salaId);
      if (!sala) return;

      try {
        const { nuevoEstado, resultado } = aplicarJugada(sala, socket.id, cartaId, posicion);
        
        salas.set(salaId, nuevoEstado);
        
        // Emitimos el resultado de la jugada al jugador que jugó
        socket.emit('jugadaResultado', {
          correcto: resultado.correcto,
          mensaje: resultado.mensaje,
          cartaId,
        });

        // Actualizamos el estado para todos
        broadcastEstado(io, salaId);

        if (nuevoEstado.fase === 'terminado') {
          const ganador = nuevoEstado.jugadores.find(j => j.socketId === nuevoEstado.ganador);
          io.to(salaId).emit('juegoTerminado', {
            ganadorNombre: ganador?.nombre || 'Desconocido',
            ganadorId: nuevoEstado.ganador,
          });
        }
      } catch (err) {
        console.error('[Jugada] Error:', err.message);
        socket.emit('errorSala', { mensaje: err.message });
      }
    });

    // ----------------------------------------------------------
    // RENDIRSE
    // ----------------------------------------------------------
    socket.on('rendirse', () => {
      const salaId = socketASala.get(socket.id);
      if (!salaId) return;

      const sala = salas.get(salaId);
      if (!sala || sala.fase !== 'jugando') return;

      const jugadorRendido = sala.jugadores.find(j => j.socketId === socket.id);
      const rival = sala.jugadores.find(j => j.socketId !== socket.id);

      console.log(`[Sala] ${jugadorRendido?.nombre} se ha rendido en sala ${salaId}`);

      // Marcamos la sala como terminada con el rival como ganador
      const salaTerminada = {
        ...sala,
        fase: 'terminado' as const,
        ganador: rival?.socketId,
      };
      salas.set(salaId, salaTerminada);

      // Notificamos a ambos jugadores
      io.to(salaId).emit('juegoTerminado', {
        ganadorNombre: rival?.nombre || 'Desconocido',
        ganadorId: rival?.socketId,
        porRendicion: true,
        nombreRendido: jugadorRendido?.nombre,
      });

      // Actualizamos el estado visual para ambos
      broadcastEstado(io, salaId);
    });

    // ----------------------------------------------------------
    // DESCONEXIÓN
    // ----------------------------------------------------------
    socket.on('disconnect', () => {
      const salaId = socketASala.get(socket.id);
      
      if (salaId) {
        const sala = salas.get(salaId);
        if (sala && sala.fase === 'jugando') {
          // Notificamos al rival
          socket.to(salaId).emit('jugadorDesconectado', {
            mensaje: 'Tu rival se ha desconectado. Eres el ganador por abandono.',
          });
          salas.delete(salaId);
        } else if (sala) {
          // Sala en espera, simplemente la eliminamos
          salas.delete(salaId);
        }
        socketASala.delete(socket.id);
      }
      
      console.log(`[Socket] Desconectado: ${socket.id}`);
    });
  });

  // ---- ARRANCAR SERVIDOR ----
  httpServer.listen(port, () => {
    console.log(`\n🎨 ArtLine corriendo en http://${hostname}:${port}`);
    console.log(`   Modo: ${dev ? 'desarrollo' : 'producción'}\n`);
  });
});
