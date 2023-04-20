import schedulingCarousel from '../schedulingCarousel/schedulingCarousel.js';
import scheduleJsonUtil from '../../scripts/scheduleJsonUtil.js';

export default async function decorate(block) {

  const generateChannelHTML = async (url) => {
    const assets = scheduleJsonUtil(url);
    await schedulingCarousel(assets);
  };
  const header = document.getElementsByTagName('header');
  if (header && header[0]) {
    header[0].remove();
  }
  const main = document.getElementsByTagName('main')[0];
  main.style.opacity = 0;
  const carouselContainer = document.createElement('div');
  carouselContainer.id = 'carousel-container';
  main.parentNode.insertBefore(carouselContainer, main);
  const url = new URL(document.URL);
  await generateChannelHTML(url);
}
