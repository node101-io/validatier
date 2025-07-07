// function handleNewsLetter() {
//   const contactSubmit = document.getElementById('contact-submit');
//   const contactTextContent = document.getElementById('contact-text');
//   const contactInput = document.getElementById('contact-message-input');

//   contactSubmit.addEventListener('click', (event) => {
//     fetch("https://node101.io/subscribe", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" }, body: JSON.stringify({
//       email: contactInput.value, type: 'validatier'
//     }),
//   })
//     .then(res => res.json()).then(res => {
//       if ((!res || res.error) && res.error !== 'duplicated_unique_field') throw new Error(res.error);
//       if (res.error) return contactTextContent.innerHTML = 'You have already joinned the waitlist!';
//       return contactTextContent.innerHTML = 'Thank you for joining the community!';;
//     }).catch(err => {
//       contactTextContent.innerHTML = 'Please enter an valid input'
//       setTimeout(() => {
//         contactTextContent.innerHTML = 'Please subscribe to get notified about new things'
//       }, 2000);
//     });
//   })
// }
