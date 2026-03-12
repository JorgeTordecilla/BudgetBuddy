export function getRequiredRootElement(doc: Document = document): HTMLElement {
  const rootElement = doc.getElementById("root");

  if (!rootElement) {
    throw new Error('Root element "#root" was not found.');
  }

  return rootElement;
}
