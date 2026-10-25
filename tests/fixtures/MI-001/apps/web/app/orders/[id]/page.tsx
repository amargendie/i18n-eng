/** Stable public URL: /orders/:id — must remain unchanged during migration. */
export default function OrderDetail({ params }: { params: { id: string } }) {
  return (
    <main>
      <h1>Detalle del pedido {params.id}</h1>
      <p>Estado: en preparación</p>
    </main>
  );
}
