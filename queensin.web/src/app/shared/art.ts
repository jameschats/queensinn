/**
 * Theme-aware placeholder artwork, ported from the design prototype. Used where a real photo
 * does not exist yet (KVR Mahal, attractions) and underneath photos while they load. Colours
 * come from the live theme tokens, so it re-tints when the admin changes the theme.
 */
function palm(x: number, y: number, h: number, s = 1): string {
  const tx = x + 14 * s, ty = y - h;
  let d = `M${x} ${y} Q${x + 6 * s} ${y - h * .55} ${tx} ${ty}`;
  const fr = [[-70, 18], [-40, 30], [-10, 26], [20, 30], [55, 22], [80, 14], [-95, 10]];
  fr.forEach(([dx, dy]) => { d += ` M${tx} ${ty} q${dx * .45 * s} ${-dy * s} ${dx * s} ${dy * .55 * s}`; });
  return d;
}
export function artSvg(kind?: string): string {
  const W = 1600, H = 1000;
  const g = (id: string, stops: [number, string, number?][], x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, op = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${op}"/>`).join('')}</linearGradient>`;
  const P = 'var(--color-primary)', A = 'var(--color-accent)', SF = 'var(--color-surface)';
  const D = 'color-mix(in srgb, var(--color-primary) 78%, #000)';
  const uid = 'qa' + (kind ?? 'x');   // deterministic, so server and browser render the same markup
  let defs = '';
  let body = '';
  switch (kind) {
    case 'dusk': case 'garden': {
      defs = g(uid + 'k', [[0, D], [.55, P], [.86, A, .55], [1, A, .85]]) + `<radialGradient id="${uid}r" cx=".72" cy=".78" r=".5"><stop offset="0" stop-color="${A}" stop-opacity=".55"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`;
      body = `<rect width="${W}" height="${H}" fill="url(#${uid}k)"/><rect width="${W}" height="${H}" fill="url(#${uid}r)"/>`;
      body += `<path d="M1180 760 V560 l14-40 14 40 V760" fill="${D}" opacity=".7"/><path d="M1194 520v-60M1186 475h16" stroke="${D}" stroke-width="4" opacity=".7"/>`;
      if (kind === 'dusk') {
        body += `<rect x="260" y="610" width="760" height="170" fill="${D}"/><rect x="420" y="560" width="440" height="60" fill="${D}"/>`;
        for (let r = 0; r < 3; r++) for (let c = 0; c < 14; c++) body += `<rect x="${290 + c * 52}" y="${640 + r * 42}" width="22" height="16" fill="${A}" opacity="${(c * 7 + r * 3) % 5 ? .75 : .2}"/>`;
      }
      body += `<path d="M0 790 Q400 760 800 785 T1600 775 V1000 H0z" fill="${D}"/>`;
      body += `<path d="${palm(140, 800, 330, 1.1)} ${palm(1380, 800, 380, 1.2)} ${palm(1500, 810, 280, .9)} ${palm(60, 810, 240, .8)}" stroke="${D}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
      if (kind === 'garden') body += `<g fill="${D}">${[260, 520, 800, 1050].map((x, i) => `<ellipse cx="${x}" cy="${770 - i % 2 * 10}" rx="${110 + i * 12}" ry="${70 + i * 6}"/>`).join('')}</g><path d="M0 860 Q800 830 1600 860" stroke="${A}" stroke-opacity=".35" stroke-width="2" fill="none"/>`;
      break;
    }
    case 'arch': case 'hall': case 'mandap': case 'portico': {
      defs = g(uid + 'k', [[0, D], [1, P]]) + `<radialGradient id="${uid}r" cx=".5" cy=".35" r=".6"><stop offset="0" stop-color="${A}" stop-opacity=".45"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>`;
      body = `<rect width="${W}" height="${H}" fill="url(#${uid}k)"/><rect width="${W}" height="${H}" fill="url(#${uid}r)"/>`;
      const n = kind === 'hall' ? 7 : 5, w = W / n;
      for (let i = 0; i < n; i++) { const x = i * w + w * .14, aw = w * .72; body += `<path d="M${x} 1000 V${kind === 'hall' ? 420 : 380} A${aw / 2} ${aw / 2} 0 0 1 ${x + aw} ${kind === 'hall' ? 420 : 380} V1000" fill="none" stroke="${A}" stroke-opacity="${kind === 'portico' ? .7 : .38}" stroke-width="2"/>`; }
      if (kind === 'hall' || kind === 'arch') for (let i = 0; i < 3; i++) { const cx = 400 + i * 400; body += `<path d="M${cx} 0 V130" stroke="${A}" stroke-opacity=".5"/><g fill="${A}">${[...Array(9)].map((_, j) => `<circle cx="${cx - 60 + j * 15}" cy="${150 + Math.abs(4 - j) * -6 + 24}" r="3.5" opacity=".85"/>`).join('')}</g><ellipse cx="${cx}" cy="175" rx="80" ry="40" fill="${A}" opacity=".12"/>`; }
      if (kind === 'hall') body += `<path d="M640 1000 L760 600 H840 L960 1000z" fill="${A}" opacity=".12"/>`;
      if (kind === 'mandap') {
        body += `<rect x="420" y="700" width="760" height="40" fill="${A}" opacity=".5"/><path d="M500 700 V420 M1100 700 V420 M470 420 H1130 M520 420 Q800 280 1080 420" stroke="${A}" stroke-width="3" fill="none"/>`;
        body += `<g fill="${A}" opacity=".7">${[...Array(28)].map((_, i) => `<circle cx="${520 + i * 20}" cy="${430 + Math.sin(i / 2) * 10}" r="5"/>`).join('')}</g>`;
        body += `<path d="M500 420 q-30 140 0 280 M1100 420 q30 140 0 280" stroke="${A}" stroke-opacity=".5" stroke-width="10" fill="none" stroke-dasharray="2 14" stroke-linecap="round"/>`;
      }
      if (kind === 'portico') body += `<rect x="0" y="880" width="${W}" height="120" fill="${D}"/><path d="M560 880 V520 H1040 V880" fill="none" stroke="${A}" stroke-width="3"/><path d="M520 520 H1080 L800 380z" fill="none" stroke="${A}" stroke-width="3"/>`;
      break;
    }
    case 'room': case 'suite': {
      defs = g(uid + 'k', [[0, SF, .18], [1, P, 1]], 1, 1) + g(uid + 'w', [[0, A, .55], [1, A, .05]]);
      body = `<rect width="${W}" height="${H}" fill="${P}"/><rect width="${W}" height="${H}" fill="url(#${uid}k)"/>`;
      body += `<rect x="1060" y="140" width="380" height="520" fill="url(#${uid}w)"/><path d="M1250 140 V660 M1060 400 H1440" stroke="${D}" stroke-width="6"/>`;
      body += `<path d="M1000 120 q20 300 -10 560 M1500 120 q-20 300 10 560" stroke="${A}" stroke-opacity=".35" stroke-width="40" fill="none"/>`;
      body += `<rect x="180" y="470" width="760" height="70" rx="6" fill="${A}" opacity=".35"/><rect x="200" y="540" width="720" height="140" fill="${D}" opacity=".8"/><rect x="230" y="420" width="200" height="70" rx="30" fill="${SF}" opacity=".5"/><rect x="460" y="420" width="200" height="70" rx="30" fill="${SF}" opacity=".5"/>`;
      body += `<rect x="150" y="300" width="820" height="130" fill="none" stroke="${A}" stroke-opacity=".45" stroke-width="2"/>`;
      if (kind === 'suite') body += `<path d="M1100 820 h340 v-90 a40 40 0 0 0 -40 -40 h-260 a40 40 0 0 0 -40 40z" fill="${D}" opacity=".85"/><circle cx="560" cy="200" r="40" fill="${A}" opacity=".35"/>`;
      body += `<rect y="${H - 180}" width="${W}" height="180" fill="${D}" opacity=".6"/>`;
      break;
    }
    case 'dine': case 'leaf': {
      defs = g(uid + 'k', [[0, P], [1, D]], 1, 1);
      body = `<rect width="${W}" height="${H}" fill="url(#${uid}k)"/>`;
      if (kind === 'leaf') {
        body += `<path d="M180 760 Q700 120 1460 260 Q1050 980 180 760z" fill="${A}" opacity=".28"/><path d="M180 760 Q820 520 1460 260" stroke="${A}" stroke-opacity=".6" stroke-width="3" fill="none"/>`;
        [[560, 520, 70], [760, 470, 56], [920, 560, 64], [700, 660, 50], [1060, 440, 46]].forEach(([x, y, r]) => body += `<circle cx="${x}" cy="${y}" r="${r}" fill="${SF}" opacity=".22"/><circle cx="${x}" cy="${y}" r="${r * .55}" fill="${A}" opacity=".35"/>`);
      } else {
        [[420, 500], [800, 500], [1180, 500]].forEach(([x, y]) => body += `<circle cx="${x}" cy="${y}" r="150" fill="none" stroke="${A}" stroke-opacity=".5" stroke-width="2"/><circle cx="${x}" cy="${y}" r="104" fill="${SF}" opacity=".12"/><path d="M${x - 210} ${y - 90} v180 M${x + 210} ${y - 90} v180" stroke="${A}" stroke-opacity=".55" stroke-width="3"/>`);
        body += `<g fill="${A}" opacity=".7">${[...Array(5)].map((_, i) => `<circle cx="${300 + i * 250}" cy="140" r="5"/><path d="M${300 + i * 250} 0V135" stroke="${A}" stroke-opacity=".5"/>`).join('')}</g>`;
      }
      break;
    }
    case 'sea': case 'fort': case 'mangrove': {
      defs = g(uid + 'k', [[0, D], [.62, P], [.64, A, .5], [1, D]]);
      body = `<rect width="${W}" height="${H}" fill="url(#${uid}k)"/><circle cx="1150" cy="560" r="90" fill="${A}" opacity=".55"/>`;
      body += [...Array(8)].map((_, i) => `<path d="M${100 + i * 40} ${700 + i * 32} H${1500 - i * 50}" stroke="${A}" stroke-opacity="${.35 - i * .03}" stroke-width="2"/>`).join('');
      if (kind === 'fort') body += `<path d="M220 640 V500 h40 v-30 h30 v30 h40 v-30 h30 v30 h40 v-30 h30 v30 h40 V640z" fill="${D}"/>`;
      if (kind === 'mangrove') body += `<path d="M0 640 Q200 520 420 600 Q600 500 820 610 L820 640z" fill="${D}"/><path d="M600 760 h220 l-30 22 h-160z" fill="${D}"/>`;
      if (kind === 'sea') body += `<g fill="none" stroke="${SF}" stroke-opacity=".6" stroke-width="3">${[[300, 300], [380, 260], [460, 320], [520, 280]].map(([x, y]) => `<path d="M${x} ${y} q16 -14 32 0 q16 -14 32 0"/>`).join('')}</g>`;
      break;
    }
    case 'basilica': case 'minaret': case 'gopuram': {
      defs = g(uid + 'k', [[0, D], [.7, P], [1, A, .6]]);
      body = `<rect width="${W}" height="${H}" fill="url(#${uid}k)"/>`;
      if (kind === 'basilica') body += `<path d="M560 900 V520 l90 -70 90 70 V900z M860 900 V520 l90 -70 90 70 V900z M740 900 V600 h120 V900z" fill="${A}" opacity=".55"/><path d="M650 450 V330 M950 450 V330 M638 360h24 M938 360h24" stroke="${A}" stroke-opacity=".6" stroke-width="5"/><path d="M770 900 V700 a30 30 0 0 1 60 0 V900" fill="${P}"/>`;
      if (kind === 'minaret') { [480, 620, 980, 1120].forEach((x, i) => body += `<rect x="${x}" y="${380 - (i % 3) * 60}" width="34" height="${520 + (i % 3) * 60}" fill="${A}" opacity=".55"/><circle cx="${x + 17}" cy="${370 - (i % 3) * 60}" r="24" fill="${A}" opacity=".55"/>`); body += `<path d="M680 900 V600 q120 -160 240 0 V900z" fill="${A}" opacity=".55"/><rect x="790" y="280" width="20" height="640" fill="${A}" opacity=".6"/>`; }
      if (kind === 'gopuram') body += `<path d="M560 900 L620 300 H980 L1040 900z" fill="${A}" opacity=".7"/>${[...Array(8)].map((_, i) => `<path d="M${575 + i * 7} ${840 - i * 70} H${1025 - i * 7}" stroke="${D}" stroke-width="3"/>`).join('')}<rect x="760" y="760" width="80" height="140" fill="${D}"/><rect x="0" y="900" width="${W}" height="100" fill="${A}" opacity=".25"/>`;
      body += `<rect y="900" width="${W}" height="100" fill="${D}"/>`;
      break;
    }
    default: body = `<rect width="${W}" height="${H}" fill="${P}"/>`;
  }
  return `<svg class="art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`;
}

