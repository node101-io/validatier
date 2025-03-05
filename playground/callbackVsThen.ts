
const returnPromise = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve('Hello, world! | .then()');
    }, 5000);
  });
}

const returnCallback = (callback: (data: string) => any) => {
  setTimeout(() => {
    return callback('Hello, world! | callback');
  }, 5000);
}

export default async () => {

  returnCallback((data) => {
    console.log(data);

    const promise = returnPromise();

    console.log('after getting a promise we can do sth');
    console.log('Hello, world! | middle');
  
    promise.then((data) => {
      console.log(data)
    })
  })
}
