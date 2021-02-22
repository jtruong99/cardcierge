const sign_out = document.getElementById('sign_out');
const fill_button = document.getElementById('autofill');
const manage_card_button = document.getElementById("mangage_card");

chrome.runtime.sendMessage({ message: 'userStatus' },
    function (response) {
        console.log('we got a response', response);
        if (response.message === 'success') {
            document.getElementById('name').innerText =                
            response.email;
        }
    }
);


manage_card_button.addEventListener('click', () => {
    console.log("Clicked Manage Card");
    chrome.browserAction.setPopup({
        popup: '/html/popup-manage-cc.html'
    });
    window.location.replace('/html/popup-manage-cc.html');  
});

sign_out.addEventListener('click', () => {
    console.log("clicked logout");
    chrome.runtime.sendMessage({ message: 'logout' },
    function (response) {
        if (response === 'success') {
            chrome.browserAction.setPopup({
                popup: '/html/popup-sign-in.html'
            });
           window.location.replace('/html/popup-sign-in.html');
        }
    });
});


fill_button.addEventListener('click', () => {
    console.log("clicked fill");
    chrome.tabs.executeScript({
        file: '/background_js/autofill.js'
      }); 
});
