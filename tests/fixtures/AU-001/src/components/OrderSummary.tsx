export function OrderSummary({ createdAt }: { createdAt: Date }) {
  const when = createdAt.toLocaleDateString('en-US');
  return <p>Pedido creado el {when}</p>;
}
