export function Marca({ tamanho }: { tamanho?: number }) {
  return (
    <span style={tamanho ? { fontSize: tamanho, fontWeight: 700, letterSpacing: '-.5px' } : undefined}>
      <span className="brand-one">One</span>
      <span className="brand-check">Check</span>
    </span>
  );
}
