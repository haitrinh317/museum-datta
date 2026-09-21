const EXPERIENCES = Object.freeze({
  'TB.012': Object.freeze({
    code: 'TB.012',
    commonName: 'Cá voi lưng gù',
    specimenTitle: 'Bộ xương cá voi lưng gù',
    scientificName: 'Megaptera novaeangliae',
    author: 'Borowski, 1781',
    targetUrl: '/ar/TB.012.mind',
    targetImageUrl: '/ar/TB.012-target.jpg',
    videoUrl: '/ar/TB.012.webm',
    specimenUrl: '/specimen/?code=TB.012',
    arUrl: '/ar/?code=TB.012',
    targetPageUrl: '/ar/target/?code=TB.012',
  }),
});

export function normalizeExperienceCode(value) {
  return String(value || '').trim().toUpperCase();
}

export function getExperience(code) {
  return EXPERIENCES[normalizeExperienceCode(code)] || null;
}

export function getExperienceFromLocation(location = window.location) {
  const params = new URLSearchParams(location.search);
  return getExperience(params.get('code') || 'TB.012');
}

export function getSupportedExperienceCodes() {
  return Object.keys(EXPERIENCES);
}
