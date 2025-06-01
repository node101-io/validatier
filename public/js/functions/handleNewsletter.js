function handleNewsLetter() {
  const contactSubmit = document.getElementById('contact-submit');
  const contactTextContent = document.getElementById('contact-text');
  const contactInput = document.getElementById('contact-message-input');

  const { protocol, host } = window.location;
  const BASE_URL = `${protocol}//${host}/`;
  const API_ENDPOINT = 'validator/contact';

  contactSubmit.addEventListener('click', (event) => {
    if (!contactInput.value) return;
    const url = BASE_URL + API_ENDPOINT + `?email_address=${contactInput.value}`;
    serverRequest(url, 'GET', {}, (response) => {
      if (response.success) {
        contactTextContent.innerHTML = 'Thank you for joining our community!'
        setTimeout(() => {
          contactTextContent.innerHTML = 'Please contact us if you would like to contribute.'
        }, 10 * 1000);
      } else {
        contactTextContent.innerHTML = 'Please enter a valid email address.'
        setTimeout(() => {
          contactTextContent.innerHTML = 'Please contact us if you would like to contribute.'
        }, 2 * 1000);
      }
    })
  })
}