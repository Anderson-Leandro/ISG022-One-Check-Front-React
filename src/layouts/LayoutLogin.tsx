import type { ReactNode } from 'react';
import { Marca } from '../components/Marca';

/** Moldura comum às telas de login/MFA (classes login-wrap/login-card do style.css). */
export function LayoutLogin({ children, larguraMaxima }: { children: ReactNode; larguraMaxima?: number }) {
  return (
    <div className="login-wrap">
      <div className="login-card" style={larguraMaxima ? { maxWidth: larguraMaxima } : undefined}>
        <div className="login-logo mb-2">
          <Marca tamanho={larguraMaxima ? 24 : 28} />
        </div>
        {children}
      </div>
    </div>
  );
}
