'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './Chat.module.css';

interface Mensaje {
  id: string;
  autor: string;
  texto: string;
  esMio: boolean;
  hora: string;
}

interface ChatProps {
  miNombre: string;
  salaId: string;
  socket: any;
  onChatAbierto?: (abierto: boolean) => void;
}

export default function Chat({ miNombre, salaId, socket, onChatAbierto }: ChatProps) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    onChatAbierto?.(abierto);
  }, [abierto, onChatAbierto]);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [noLeidos, setNoLeidos] = useState(0);
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Escuchar mensajes entrantes
  useEffect(() => {
    if (!socket) return;

    const handler = ({ autor, texto, hora }: { autor: string; texto: string; hora: string }) => {
      const esMio = autor === miNombre;
      setMensajes(prev => [...prev, {
        id: `${Date.now()}-${Math.random()}`,
        autor,
        texto,
        esMio,
        hora,
      }]);
      if (!abierto && !esMio) {
        setNoLeidos(n => n + 1);
      }
    };

    socket.on('mensajeChat', handler);
    return () => socket.off('mensajeChat', handler);
  }, [socket, miNombre, abierto]);

  // Scroll al último mensaje cuando llega uno nuevo
  useEffect(() => {
    if (abierto && listaRef.current) {
      listaRef.current.scrollTop = listaRef.current.scrollHeight;
    }
  }, [mensajes, abierto]);

  // Al abrir, limpiar no leídos y foco en input
  useEffect(() => {
    if (abierto) {
      setNoLeidos(0);
      setTimeout(() => inputRef.current?.focus(), 100);
      if (listaRef.current) {
        listaRef.current.scrollTop = listaRef.current.scrollHeight;
      }
    }
  }, [abierto]);

  function enviar() {
    const texto = input.trim();
    if (!texto || !socket) return;

    const hora = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    socket.emit('mensajeChat', { salaId, autor: miNombre, texto, hora });
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  }

  return (
    <div className={styles.contenedor}>
      {/* Panel de chat */}
      <div className={`${styles.panel} ${abierto ? styles.panelAbierto : ''}`}>
        <div className={styles.cabecera}>
          <span className={styles.cabeceraTexto}>Chat</span>
          <button className={styles.btnCerrar} onClick={() => setAbierto(false)}>✕</button>
        </div>

        <div className={styles.lista} ref={listaRef}>
          {mensajes.length === 0 ? (
            <p className={styles.vacio}>Sin mensajes aún. ¡Di algo!</p>
          ) : (
            mensajes.map(m => (
              <div
                key={m.id}
                className={`${styles.mensaje} ${m.esMio ? styles.mensajeMio : styles.mensajeRival}`}
              >
                {!m.esMio && <span className={styles.autor}>{m.autor}</span>}
                <div className={styles.burbuja}>
                  <span className={styles.texto}>{m.texto}</span>
                  <span className={styles.hora}>{m.hora}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className={styles.inputZona}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Escribe un mensaje..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            maxLength={200}
          />
          <button
            className={styles.btnEnviar}
            onClick={enviar}
            disabled={!input.trim()}
          >
            ↑
          </button>
        </div>
      </div>

      {/* Botón flotante */}
      <button
        className={`${styles.btnFlotante} ${noLeidos > 0 ? styles.btnConNotif : ''}`}
        onClick={() => setAbierto(a => !a)}
        title="Chat"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        {noLeidos > 0 && (
          <span className={styles.badge}>{noLeidos}</span>
        )}
      </button>
    </div>
  );
}
