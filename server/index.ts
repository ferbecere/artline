import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server, type Server as IOServer } from 'socket.io';
import { inicializarJuego, aplicarJugada, estadoParaCliente } from '../lib/logicaJuego';
import { obtenerCartasAleatorias } from '../lib/metApi';
import type { EstadoJuego, Jugador } from '../types/juego';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const salas = new Map<string, EstadoJuego>();
const socketASala = new Map<string, string>();

function generarIdSala(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function broadcastEstado(io: IOServer, salaId: string): void {
  const sala = salas.get(salaId);
  if (!sala) return;
  sala.jugadores.forEach((jugador: Jugador) => {
    const estadoPersonalizado = estadoParaCliente(sala, jugador.socketId);
    io.to(jugador.socketId).emit('estadoActualizado', estadoPersonalizado);
  });
}

app.prepare().then(() => {
  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const parsedUrl = parse(req.url ?? '/', true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? '*' : process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Conectado: ${socket.id}`);

    socket.on('crearSala', async ({ nombre }: { nombre: string }) => {
      if (!nombre || nombre.trim().length === 0) {
        socket.emit('errorSala', { mensaje: 'El nombre no puede estar vacío' });
        return;
      }
      const salaId = generarIdSala();
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

    socket.on('unirseASala', async ({ salaId, nombre }: { salaId: string; nombre: string }) => {
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

      sala.jugadores.push({ socketId: socket.id, nombre: nombre.trim(), mano: [], listaOrden: [] });
      socketASala.set(socket.id, codigoNormalizado);
      socket.join(codigoNormalizado);
      socket.emit('salaUnida', { salaId: codigoNormalizado, nombre: nombre.trim() });
      console.log(`[Sala] ${nombre} se unió a la sala ${codigoNormalizado}. Iniciando juego...`);

      try {
        console.log(`[MetAPI] Cargando cartas para sala ${codigoNormalizado}...`);
        const cartas = await obtenerCartasAleatorias(45);
        const estadoInicial = inicializarJuego(codigoNormalizado, sala.jugadores, cartas);
        salas.set(codigoNormalizado, estadoInicial);
        io.to(codigoNormalizado).emit('juegoIniciado', { mensaje: '¡El juego ha comenzado!' });
        broadcastEstado(io, codigoNormalizado);
      } catch (err) {
        console.error('[Juego] Error iniciando juego:', err);
        io.to(codigoNormalizado).emit('errorSala', {
          mensaje: 'Error cargando obras de arte. Intenta de nuevo.',
        });
      }
    });

    socket.on('colocarCarta', ({ cartaId, posicion }: { cartaId: number; posicion: number }) => {
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
        socket.emit('jugadaResultado', { correcto: resultado.correcto, mensaje: resultado.mensaje, cartaId });
        broadcastEstado(io, salaId);
        if (nuevoEstado.fase === 'terminado') {
          const ganador = nuevoEstado.jugadores.find((j: Jugador) => j.socketId === nuevoEstado.ganador);
          io.to(salaId).emit('juegoTerminado', {
            ganadorNombre: ganador?.nombre || 'Desconocido',
            ganadorId: nuevoEstado.ganador,
          });
        }
      } catch (err: unknown) {
        const mensaje = err instanceof Error ? err.message : 'Error desconocido';
        console.error('[Jugada] Error:', mensaje);
        socket.emit('errorSala', { mensaje });
      }
    });

    socket.on('rendirse', () => {
      const salaId = socketASala.get(socket.id);
      if (!salaId) return;
      const sala = salas.get(salaId);
      if (!sala || sala.fase !== 'jugando') return;

      const jugadorRendido = sala.jugadores.find((j: Jugador) => j.socketId === socket.id);
      const rival = sala.jugadores.find((j: Jugador) => j.socketId !== socket.id);
      console.log(`[Sala] ${jugadorRendido?.nombre} se ha rendido en sala ${salaId}`);

      const salaTerminada: EstadoJuego = { ...sala, fase: 'terminado', ganador: rival?.socketId };
      salas.set(salaId, salaTerminada);
      io.to(salaId).emit('juegoTerminado', {
        ganadorNombre: rival?.nombre || 'Desconocido',
        ganadorId: rival?.socketId,
        porRendicion: true,
        nombreRendido: jugadorRendido?.nombre,
      });
      broadcastEstado(io, salaId);
    });

    socket.on('disconnect', () => {
      const salaId = socketASala.get(socket.id);
      if (salaId) {
        const sala = salas.get(salaId);
        if (sala && sala.fase === 'jugando') {
          socket.to(salaId).emit('jugadorDesconectado', {
            mensaje: 'Tu rival se ha desconectado. Eres el ganador por abandono.',
          });
        }
        salas.delete(salaId);
        socketASala.delete(socket.id);
      }
      console.log(`[Socket] Desconectado: ${socket.id}`);
    });
  });

  httpServer.listen(port, () => {
    console.log(`\n🎨 ArtLine corriendo en http://${hostname}:${port}`);
    console.log(`   Modo: ${dev ? 'desarrollo' : 'producción'}\n`);
  });
});
