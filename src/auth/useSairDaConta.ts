import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlash } from '../components/Flash';
import { useAuth } from './AuthContext';

/** Encerra a sessão e leva ao login com a confirmação, que some sozinha (o mesmo em todos os layouts). */
export function useSairDaConta() {
  const { sair } = useAuth();
  const { definirFlash } = useFlash();
  const navegar = useNavigate();
  return useCallback(async () => {
    await sair();
    definirFlash('sucesso', 'Você saiu com sucesso.');
    navegar('/login', { replace: true });
  }, [sair, definirFlash, navegar]);
}
