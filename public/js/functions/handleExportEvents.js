
function handleExportEvents (sort_by, order, bottom_timestamp, top_timestamp) {

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
      event.target.appendChild(document.getElementById('export-choice-check-indicator'));
    } else if (event.target.id == 'export-choice-download-button' || event.target.parentNode.id == 'export-choice-download-button') {

      const bottomDate = document.getElementById(bottom_timestamp).value;
      const topDate = document.getElementById(top_timestamp).value

      const bottomTimestamp = Math.floor(new Date(bottomDate).getTime() / 1000);
      const topTimestamp = Math.floor(new Date(topDate).getTime() / 1000);   

      getExportData(
        'timestamp', 
        document.getElementById(sort_by).innerHTML, 
        document.getElementById(order).innerHTML, 
        bottomTimestamp,
        topTimestamp,
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

async function getExportData(search_by, sort_by, order, bottom_timestamp, top_timestamp, range) {
  return new Promise((resolve, reject) => {
    const GET_VALIDATORS_API_ENDPOINT = 'validator/rank_validators';
    const BASE_URL = window.location.href;
    const dataToBeExported = []

    let promises = [];
    if (range <= 0) range = top_timestamp - bottom_timestamp;

    while (bottom_timestamp < top_timestamp) {
      
      const eachBottomTimestamp = bottom_timestamp;
      const eachTopTimestamp = bottom_timestamp + range;
      bottom_timestamp = eachTopTimestamp;

      const requestPromise = new Promise((resolveRequest, rejectRequest) => {
        serverRequest(
          BASE_URL + GET_VALIDATORS_API_ENDPOINT + `?sort_by=${sort_by}&order=${order}&bottom_timestamp=${eachBottomTimestamp}&top_timestamp=${eachTopTimestamp}&with_photos=false`,
          'GET',
          {},
          (response) => {
            if (response.err || !response.success) {
              rejectRequest(response.err);
              return;
            }
            dataToBeExported.push(response.data);
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
