
function handleExportEvents (sort_by, order, bottom_block_height, top_block_height) {

  let selectedRangeValue = 0;

  document.addEventListener('click', (event) => {
    if (event.target.id == 'export-wrapper-toggle' || event.target.parentNode.id == 'export-wrapper-toggle') {
      if (document.getElementById('export-wrapper-toggle').getAttribute('isOpen') == 'false') {
        event.target.nextSibling.style.transform = 'perspective(8000px) rotateX(0deg)';
        document.getElementById('export-wrapper-toggle').setAttribute('isOpen', 'true');
      } else {
        event.target.nextSibling.style.transform = 'perspective(8000px) rotateX(-90deg)';
        document.getElementById('export-wrapper-toggle').setAttribute('isOpen', 'false');
      }
    }
    else if (event.target.classList.contains('each-export-choice')) {
      document.querySelectorAll('.each-export-choice').forEach(each => each.classList.remove('export-choice-selected'));
      event.target.classList.add('export-choice-selected');
      selectedRangeValue = event.target.getAttribute('range');
      event.target.appendChild(document.getElementById('export-choice-check-indicator'))
    } else if (event.target.id == 'export-choice-download-button' || event.target.parentNode.id == 'export-choice-download-button') {
      getExportData(
        'block_height', 
        document.getElementById(sort_by).innerHTML, 
        document.getElementById(order).innerHTML, 
        parseInt(document.getElementById(bottom_block_height).innerHTML), 
        parseInt(document.getElementById(top_block_height).innerHTML), 
        parseInt(selectedRangeValue)
      )
      .then((dataToBeExported) => {
        const filename = document.getElementById('export-choice-rename-input').value;
        downloadCSV(dataToBeExported, filename);
      })
      .catch(err => console.log(err))
    }
  })
}

async function getExportData(search_by, sort_by, order, bottom_block_height, top_block_height, range) {
  return new Promise((resolve, reject) => {
    const GET_VALIDATORS_API_ENDPOINT = 'validator/rank_validators';
    const BASE_URL = window.location.href;
    const dataToBeExported = {
      data: [],
      total: 0
    };

    let promises = [];
    if (range <= 0) range = top_block_height - bottom_block_height;

    while (bottom_block_height < top_block_height) {
      
      const eachBottomBlockHeight = bottom_block_height;
      const eachTopBlockHeight = bottom_block_height + range;
      bottom_block_height = eachTopBlockHeight;

      const requestPromise = new Promise((resolveRequest, rejectRequest) => {
        serverRequest(
          BASE_URL + GET_VALIDATORS_API_ENDPOINT + `?sort_by=${sort_by}&order=${order}&search_by=${search_by}&bottom_block_height=${eachBottomBlockHeight}&top_block_height=${eachTopBlockHeight}`,
          'GET',
          {},
          (response) => {
            if (response.err || !response.success) {
              rejectRequest(response.err);
              return;
            }
            dataToBeExported.data.push(response.data);
            dataToBeExported.total++;
            resolveRequest();
          }
        );
      });

      promises.push(requestPromise);
    }

    Promise.all(promises)
      .then(() => resolve(dataToBeExported))
      .catch((error) => reject(error));
  });
}
