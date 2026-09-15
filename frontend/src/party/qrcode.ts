import QRCode from 'qrcode';

export async function generateQrSvg(text: string): Promise<string> {
    try {
        return await QRCode.toString(text, {
            type: 'svg',
            margin: 1,
            color: {
                dark: '#00f0ff',
                light: '#0a0a16',
            }
        });
    } catch (e) {
        console.error('Failed to generate QR', e);
        return `<div class="qr-fallback">${text}</div>`;
    }
}
