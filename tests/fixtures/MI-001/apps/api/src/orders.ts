import type { OrderResponse } from '@synth/contracts';

export function getOrder(id: string): OrderResponse {
  if (!id) {
    return { ok: false, message: 'Identificador de pedido no válido.' };
  }
  return {
    ok: true,
    message: 'Pedido recuperado correctamente.',
    orderId: id,
    status: 'preparing',
  };
}
