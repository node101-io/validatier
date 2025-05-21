
function formatTimestamp (timestamp) {
  return new Date(timestamp).toISOString().split('T')[0];
}

function handleExportEvents () {

  let selectedRangeValue = 0;
  const validatorsMainWrapper = document.getElementById('validators-main-wrapper');

  document.addEventListener('click', (event) => {
    
    let target = event.target;
    while (target != document.body && !target.classList.contains('each-export-choice')) target = target.parentNode;
    if (!target.classList.contains('each-export-choice')) return;

    document.querySelectorAll('.each-export-choice').forEach(each => {
      each.classList.remove('export-choice-selected')
      each.children[0].children[0].style.display = 'none';
    });
    target.classList.add('export-choice-selected');
    target.children[0].children[0].style.display = 'unset';
    selectedRangeValue = target.getAttribute('range');
  })

  document.getElementById('export-choice-cancel-button').addEventListener('click', (event) => {
    document.getElementById('export-wrapper-toggle').nextSibling.style.transform = 'perspective(8000px) rotateX(-90deg)';
    document.getElementById('export-wrapper-toggle').nextSibling.style.opacity = '0';
    document.getElementById('export-wrapper-toggle').setAttribute('isOpen', 'false');
  })


  document.body.addEventListener('click', (event) => {
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
    } else if (event.target.id == 'export-choice-download-button' || event.target.parentNode.id == 'export-choice-download-button') {


      const BASE_URL = !window.location.href.includes('#') ? window.location.href : window.location.href.split('#')[0];
      const EXPORT_API_ENDPOINT = 'validator/export_csv';

      const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
      const topDate = document.getElementById('periodic-query-top-timestamp').value

      const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
      const topTimestamp = Math.floor(new Date(topDate).getTime());
      const sortBy = validatorsMainWrapper.getAttribute('sort_by');
      const sortOrder = validatorsMainWrapper.getAttribute('order');
      const range = parseInt(selectedRangeValue);
      
      const chainIdentifier = document.getElementById('network-switch-header').getAttribute('current_chain_identifier');
      const url = BASE_URL + EXPORT_API_ENDPOINT + `?sort_by=${sortBy}&order=${sortOrder}&range=${range}&bottom_timestamp=${bottomTimestamp}&top_timestamp=${topTimestamp}&chain_identifier=${chainIdentifier}`;

      const downloadButtonInnerHTML = document.getElementById('export-choice-download-button').innerHTML;
      document.getElementById('export-choice-download-button').innerHTML = '';
      document.getElementById('export-choice-download-button').appendChild(createSpinner(10));
      document.getElementById('export-choice-download-button').disabled = true;
      document.getElementById('export-choice-download-button').style.cursor = 'var(--pointer-default-dark)';
      fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status}`);
  
        return response.blob().then((blob) => {
          if (blob.size === 0) throw new Error('file_empty');
  
          const contentType = response.headers.get('Content-Type');
          const isZip = contentType === 'application/zip';
  
          return { blob, isZip };
        });
      })
      .then(({ blob, isZip }) => {
          const downloadUrl = URL.createObjectURL(blob);
          const fileExtension = isZip ? 'zip' : 'csv';
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `validator-timeline-${formatTimestamp(parseInt(bottomTimestamp))}_${formatTimestamp(parseInt(topTimestamp))}.${fileExtension}`;
  
          document.body.appendChild(a);
          a.click();
  
          document.body.removeChild(a);
          URL.revokeObjectURL(downloadUrl);
          document.getElementById('export-choice-download-button').innerHTML = downloadButtonInnerHTML;
          document.getElementById('export-choice-download-button').disabled = false;
          document.getElementById('export-choice-download-button').style.cursor = 'var(--pointer-hand-dark)';
      })
      .catch(error => console.error('Download failed:', error));
    } else {
      let target = event.target;
      while (target != document.body && !target.classList.contains('export-main-wrapper')) target = target.parentNode;
      if (target.classList.contains('export-main-wrapper')) return;

      document.getElementById('export-wrapper-toggle').nextSibling.style.transform = 'perspective(8000px) rotateX(-90deg)';
      document.getElementById('export-wrapper-toggle').nextSibling.style.opacity = '0';
      document.getElementById('export-wrapper-toggle').setAttribute('isOpen', 'false');
    }
  })
}
