/**
 * QR Code Generation + JWT Signing
 *
 * Used by the approve module:
 * 1. Sign a JWT with registration data (self-verifying QR payload)
 * 2. Generate a QR code image from the JWT string
 *
 * Used by the scanner module:
 * 1. Decode and verify the JWT from a scanned QR
 */

const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Generate a signed QR token for a registration.
 * Token has no expiry — a ticket is a ticket.
 */
function signQrToken({ registrationId, eventId, participantId }) {
  return jwt.sign(
    { registrationId, eventId, participantId, role: 'qr' },
    JWT_SECRET
    // No expiresIn — QR tickets don't expire
  );
}

/**
 * Verify and decode a QR token.
 * Returns decoded payload or throws on invalid signature.
 */
function verifyQrToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Generate a QR code as a base64 data URL.
 * Suitable for embedding in emails and displaying in browser.
 */
async function generateQrImage(data) {
  const dataUrl = await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  return dataUrl;
}

/**
 * Generate a QR code as a Buffer (PNG).
 * Useful for attaching to emails as an image.
 */
async function generateQrBuffer(data) {
  return QRCode.toBuffer(data, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
  });
}

module.exports = {
  signQrToken,
  verifyQrToken,
  generateQrImage,
  generateQrBuffer,
};
