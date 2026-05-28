// Contact info for WhatsApp deep-links.
// Formato internacional sin '+' ni espacios.
export const WHATSAPP_NUMBER = "593998512965";

export const WHATSAPP_DEFAULT_MESSAGE =
  "Hola, estoy interesado en inscribirme. ¿Me podrías dar más información?";

export const LOCATION = {
  name: "GYMNITE",
  lat: -0.080951,
  lng: -78.4298972,
  maps_url:
    "https://www.google.com/maps/place/GYMNITE/@-0.080951,-78.4298972,17z/data=!3m1!4b1!4m6!3m5!1s0x91d58f002bbfaa87:0x91f2bbc10b8d14f9!8m2!3d-0.080951!4d-78.4298972!16s%2Fg%2F11x1p4ryqm",
};

export const SOCIAL_LINKS = {
  tiktok: "https://www.tiktok.com/@teamnite7",
  instagram:
    "https://www.instagram.com/team_gymnite?igsh=MXQ0NHdpOXNsdjg1eg%3D%3D&utm_source=qr",
};

/**
 * Build a WhatsApp deep-link with a pre-filled message.
 * @param {string} message
 * @returns {string} https://wa.me URL
 */
export function buildWhatsAppLink(message = WHATSAPP_DEFAULT_MESSAGE) {
  const text = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
}
