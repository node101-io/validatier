
import async from 'async';

export const getArrayOfChainIdentifiers = () => {

  fetch('https://status.cosmos.directory/')
    .then(response => response.json())
    .then((data) => {
      const chainsArray = data.chains;
      const identifiersArray: string[] = [];
      async.timesSeries(
        chainsArray.length, 
        (i, next) => {
          identifiersArray.push(chainsArray[i].name);
          next()
        }, 
        (err) => {
          if (err) return console.error(err);
          return console.log(identifiersArray)
        }
      )
    })
}
