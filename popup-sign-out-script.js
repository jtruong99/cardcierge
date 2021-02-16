const button = document.querySelector('button[type="submit"]');
const fill_button = document.querySelector('button[type="button"]');

chrome.runtime.sendMessage({ message: 'userStatus' },
    function (response) {
        console.log('we got a response', response);
        if (response.message === 'success') {
            document.getElementById('name').innerText =                
            response.email;
        }
    }
);

button.addEventListener('click', () => {
    console.log("clicked logout");
    chrome.runtime.sendMessage({ message: 'logout' },
    function (response) {
        if (response === 'success') {
            chrome.browserAction.setPopup({
                popup: './popup-sign-in.html'
            });
           window.location.replace('./popup-sign-in.html');
        }
    });
});


fill_button.addEventListener('click', () => {
    console.log("clicked fill");
    chrome.tabs.executeScript({
        file: 'autofill.js'
      }); 
});
