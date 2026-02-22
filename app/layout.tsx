import type { Metadata } from 'next';
import './globals.css';
import { SocketProvider } from '@/context/SocketContext';

export const metadata: Metadata = {
  title: 'ArtLine — El Timeline del Arte',
  description: 'Juego multijugador de obras de arte del Metropolitan Museum of Art',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
