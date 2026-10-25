// Half-introduced helper; keys are not backed by a catalog.
function t(key: string) {
  return key;
}

export function AccountPage() {
  return (
    <section>
      <h1>{t('account.title')}</h1>
      <button type="button">Guardar cambios</button>
      <p>Último acceso: hace 3 días</p>
    </section>
  );
}
