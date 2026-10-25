export type OrderResponse = {
  ok: boolean;
  /** User-visible message; ownership of locale/copy is currently unclear. */
  message: string;
  orderId?: string;
  status?: string;
};
