export function randomRange(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function randomMeteorColor() {
  const hues = [
    '#4a3f35', // dark brown
    '#5c5048', // metallic gray-brown
    '#6d5e55', // warm brown-gray
    '#3e2723', // very dark brown
    '#5d4037', // medium brown
    '#6b4423', // rust brown
  ];
  return hues[Math.floor(Math.random() * hues.length)];
}

export function randomPlasmaColor() {
  const hues = [
    '#ffffff', // white-hot core
    '#ffffff',
    '#fffa65', // bright yellow
    '#fffa65',
    '#ff9f43', // orange
    '#ff9f43',
    '#ff6b81', // red-orange
  ];
  return hues[Math.floor(Math.random() * hues.length)];
}

function varyHexColor(hex: string, variance: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const vr = Math.max(0, Math.min(255, r + randomRange(-variance, variance)));
  const vg = Math.max(0, Math.min(255, g + randomRange(-variance, variance)));
  const vb = Math.max(0, Math.min(255, b + randomRange(-variance, variance)));
  return `#${Math.round(vr).toString(16).padStart(2, '0')}${Math.round(vg).toString(16).padStart(2, '0')}${Math.round(vb).toString(16).padStart(2, '0')}`;
}

export function randomTailColor() {
  const hues = [
    '#ff5e57', // coral red
    '#ff7f50', // lighter coral
    '#e74c3c', // deep red
    '#c0392b', // dark red
    '#a93226', // blood red
    '#ff9f43', // warm orange
    '#e67e22', // burnt orange
    '#d35400', // deep orange
    '#8b4513', // burnt brown
    '#6b4423', // dark rust
    '#5a4d42', // dark smoke
    '#4a3f35', // darker smoke
    '#777777', // gray ash
    '#999999', // lighter ash
    '#b0a090', // warm ash
  ];
  const base = hues[Math.floor(Math.random() * hues.length)];
  return varyHexColor(base, 32);
}
