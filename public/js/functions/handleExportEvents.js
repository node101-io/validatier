
function handleExportEvents (sort_by, order, bottom_timestamp, top_timestamp) {

  let selectedRangeValue = 0;

  document.addEventListener('click', (event) => {
    if (event.target.id == 'export-wrapper-toggle' || event.target.parentNode.id == 'export-wrapper-toggle') {
      if (document.getElementById('export-wrapper-toggle').getAttribute('isOpen') == 'false') {
        document.getElementById('export-wrapper-toggle').nextSibling.style.transform = 'perspective(8000px) rotateX(0deg)';
        document.getElementById('export-wrapper-toggle').nextSibling.style.opacity = '1';
        document.getElementById('export-wrapper-toggle').setAttribute('isOpen', 'true');
      } else {
        document.getElementById('export-wrapper-toggle').nextSibling.style.transform = 'perspective(8000px) rotateX(-90deg)';
        document.getElementById('export-wrapper-toggle').nextSibling.style.opacity = '0';
        document.getElementById('export-wrapper-toggle').setAttribute('isOpen', 'false');
      }
    }
    else if (event.target.classList.contains('each-export-choice')) {
      document.querySelectorAll('.each-export-choice').forEach(each => each.classList.remove('export-choice-selected'));
      event.target.classList.add('export-choice-selected');
      selectedRangeValue = event.target.getAttribute('range');
    } else if (event.target.id == 'export-choice-download-button' || event.target.parentNode.id == 'export-choice-download-button') {


      const BASE_URL = !window.location.href.includes('#') ? window.location.href : window.location.href.split('#')[0];
      const EXPORT_API_ENDPOINT = 'validator/export_csv';

      const bottomDate = document.getElementById(bottom_timestamp).value;
      const topDate = document.getElementById(top_timestamp).value

      const bottomTimestamp = Math.floor(new Date(bottomDate).getTime() / 1000);
      const topTimestamp = Math.floor(new Date(topDate).getTime() / 1000);
      const sortBy = document.getElementById(sort_by).innerHTML;
      const sortOrder = document.getElementById(order).innerHTML;
      const range = parseInt(selectedRangeValue);

      const a = document.createElement('a');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.href = BASE_URL + EXPORT_API_ENDPOINT + `?sort_by=${sortBy}&order=${sortOrder}&range=${range}&bottom_timestamp=${bottomTimestamp}&top_timestamp=${topTimestamp}`;
      a.target = '_self';
      a.click();
    }
  })
}
