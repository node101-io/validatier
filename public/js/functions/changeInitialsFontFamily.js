
const APPLIED_ELEMENTS_LIST = ['P', 'H1', 'H2', 'H3'];

function changeInitialsFontFamily (fontFamily) {
  if (!fontFamily) return;
  const elements = document.querySelectorAll('*');

  for (let i = 0; i < elements.length; i++) {
    
    const eachElement = elements[i];
    
    if (!APPLIED_ELEMENTS_LIST.includes(eachElement.nodeName)) continue;
    
    const isOnlyText = eachElement.innerHTML.trim() === eachElement.innerHTML.replace(/<\/?[^>]+(>|$)/g, '');

    if (!isOnlyText) continue;

    const initialContent = document.createElement('span');
    const restContent = document.createElement('span');
    initialContent.style.fontFamily = 'Sofia';

    initialContent.innerHTML = eachElement.innerHTML.slice(0, 1);
    restContent.innerHTML = eachElement.innerHTML.slice(1, eachElement.innerHTML.length);

    eachElement.innerHTML = '';
    eachElement.appendChild(initialContent);
    eachElement.appendChild(restContent);
  }
}
