import QRCode from 'qrcode';
import { getExperienceFromLocation } from './ar-config.js';

const experience = getExperienceFromLocation();
const errorBox = document.querySelector('#target-error');
const content = document.querySelector('#target-content');

function showUnsupportedExperience() {
  if (content) content.hidden = true;
  if (errorBox) errorBox.hidden = false;
}

async function boot() {
  if (!experience) {
    showUnsupportedExperience();
    return;
  }

  document.querySelectorAll('[data-ar-code]').forEach((node) => {
    node.textContent = experience.code;
  });
  document.querySelectorAll('[data-ar-title]').forEach((node) => {
    node.textContent = experience.specimenTitle;
  });
  document.querySelectorAll('[data-ar-scientific-name]').forEach((node) => {
    node.textContent = experience.scientificName;
  });

  const specimenLinks = document.querySelectorAll('[data-ar-specimen-link]');
  specimenLinks.forEach((link) => link.setAttribute('href', experience.specimenUrl));

  const directAr = document.querySelector('#btn-direct-ar');
  if (directAr) directAr.href = experience.arUrl;

  const targetPhoto = document.querySelector('#target-photo');
  if (targetPhoto) {
    targetPhoto.src = experience.targetImageUrl;
    targetPhoto.alt = `Ảnh mẫu ${experience.specimenTitle} ${experience.code}`;
  }

  const downloadLink = document.querySelector('#target-download');
  if (downloadLink) {
    downloadLink.href = experience.targetImageUrl;
    downloadLink.download = `${experience.code}-target.jpg`;
  }

  const arUrl = new URL(experience.arUrl, window.location.origin).href;
  const qrImage = document.querySelector('#qr-image');
  if (!qrImage) return;

  try {
    qrImage.src = await QRCode.toDataURL(arUrl, {
      width: 250,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#06111f', light: '#ffffff' },
    });
  } catch (error) {
    console.error('Không thể tạo QR WebAR:', error);
    qrImage.hidden = true;
    const qrError = document.querySelector('#qr-error');
    if (qrError) qrError.hidden = false;
  }
}

boot();
