// Contact info for WhatsApp deep-links.
// TODO: reemplazar WHATSAPP_NUMBER con el número real cuando el usuario lo proporcione.
// Formato internacional sin '+' ni espacios. Ejemplo Ecuador: "593999999999".
export const WHATSAPP_NUMBER = "593999999999"; // placeholder

export const WHATSAPP_DEFAULT_MESSAGE =
  "Hola, estoy interesado en inscribirme. ¿Me podrías dar más información?";

/**
 * Build a WhatsApp deep-link with a pre-filled message.
 * @param {string} message
 * @returns {string} https://wa.me URL
 */
export function buildWhatsAppLink(message = WHATSAPP_DEFAULT_MESSAGE) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
