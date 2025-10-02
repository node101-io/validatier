function getCookie(name) {
  const cookieArr = document.cookie.split("; ");
  for (let i = 0; i < cookieArr.length; i++) {
    const cookiePair = cookieArr[i].split("=");
    if (cookiePair[0] === name) {
      return cookiePair[1];
    }
  }
  return null;
}

function setCookie(name, value, days) {
  const cookieExists = getCookie(name);

  if (cookieExists !== null) {
    document.cookie = `${name}=${value}; path=/;`;
  } else {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = `${name}=${value}${expires}; path=/;`;
  }
}
