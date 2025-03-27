
function calculateMaxAndMinValue (graphDataMapping) {
  const values = Object.values(graphDataMapping);

  const minSelfStake = Math.min(...values.map(item => item.self_stake));
  const maxSelfStake = Math.max(...values.map(item => item.self_stake));
  const minWithdraw = Math.min(...values.map(item => item.withdraw));
  const maxWithdraw = Math.max(...values.map(item => item.withdraw));
  const minCommission = Math.min(...values.map(item => item.commission));
  const maxCommission = Math.max(...values.map(item => item.commission));

  const minValue = Math.min(minSelfStake, minWithdraw, minCommission);
  const maxValue = Math.max(maxSelfStake, maxWithdraw, maxCommission);
  return { minValue, maxValue }
}

function handlePlotButtonClick () {
  document.addEventListener('click', async (event) => {
    if (!event.target.classList.contains('validator-plot-graph-button')) return;

    const bottomDate = document.getElementById('periodic-query-bottom-timestamp').value;
    const topDate = document.getElementById('periodic-query-top-timestamp').value

    const operatorAddress = event.target.getAttribute('operator-address');
    const bottomTimestamp = Math.floor(new Date(bottomDate).getTime());
    const topTimestamp = Math.floor(new Date(topDate).getTime());    
    
    const graphDataMapping = {};

    const currency = document.getElementById('currency-toggle').value == 'native' ? document.getElementById('network-switch-header').getAttribute('current_chain_symbol') : 'usd';
    const decimals = document.getElementById('network-switch-header').getAttribute('current_chain_decimals');
    const usd_exchange_rate = document.getElementById('network-switch-header').getAttribute('current_chain_usd_exhange_rate');
    const symbol = document.getElementById('network-switch-header').getAttribute('current_chain_symbol');
      
    const requestData = {
      operator_address: operatorAddress,
      bottom_timestamp: bottomTimestamp,
      top_timestamp: topTimestamp,
      decimals: document.getElementById('network-switch-header').getAttribute('current_chain_decimals')
    };
  
    const queryString = new URLSearchParams(requestData).toString();
    const eventSource = new EventSource(`/validator/get_graph_data?${queryString}`);

    const worker = new Worker('/js/functions/worker.js');

    plotValidatorGraph({ operatorAddress, graphDataMapping, currency, decimals, usd_exchange_rate, symbol });
    worker.onmessage = (event) => {
      const { data } = event.data;
      graphDataMapping[data.timestamp] = data;

      const { minValue, maxValue } = calculateMaxAndMinValue(graphDataMapping);
      document.documentElement.style.setProperty('--min-value', minValue);
      document.documentElement.style.setProperty('--max-value', maxValue);

      const insertedColumn = addColumnToExistingGraph({
        operatorAddress: operatorAddress,
        data: data,
        timestamp: data.timestamp,
        index: data.index,
        currency: currency,
        decimals: decimals,
        usd_exchange_rate: usd_exchange_rate,
        symbol: symbol,
        graphDataMapping
      });
      if (!insertedColumn.previousSibling || !insertedColumn.previousSibling.classList.contains('each-graph-column-wrapper')) return;
      adjustLineWidthAndAngle(insertedColumn.previousSibling, insertedColumn, operatorAddress);
    };
    
    eventSource.onmessage = (event) => {
      const response = JSON.parse(event.data);
      
      if (!response.success || response.err) return eventSource.close();
    
      worker.postMessage({
        action: 'processData',
        data: { responseData: response }
      });
    };

    eventSource.onerror = (err) => eventSource.close();
  });
      

  let isResizing = false;
  window.onresize = () => {
    if (isResizing) return;
    isResizing = true;

    const graphWrappersArray = document.querySelectorAll('.validator-graph-wrapper');
    setTimeout(() => {
  
      for (let i = 0; i < graphWrappersArray.length; i++) {
        const eachGraphWrapper = graphWrappersArray[i];
        const operatorAddress = eachGraphWrapper.getAttribute('operator_address');
        const columnWrapper = eachGraphWrapper.querySelector('.each-graph-column-wrapper');
        
        document.documentElement.style.setProperty(
          `--graph-column-width-${operatorAddress}`, 
          columnWrapper.getBoundingClientRect().width
        );
      }
      isResizing = false;
    }, 10);
  }
}