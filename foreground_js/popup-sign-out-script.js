const sign_out = document.getElementById('sign_out');
const fill_button = document.getElementById('autofill');
const manage_card_button = document.getElementById("mangage_card");
const select = document.getElementById("selectCategory");

function init() {
    var token = "";
    const category_url = "https://cardcierge.herokuapp.com/categories/";
    chrome.storage.local.get('auth_token', function (result) {
        fetch(category_url, {
            method: 'GET',
            headers: {
                'Authorization': 'Token ' + result.auth_token,
            }
        })
            .then(res => res.json())
            .then(resJson => {
                for (var entry in resJson) {
                    var opt = resJson[entry].name;
                    var el = document.createElement("option");
                    el.text = opt;
                    el.value = opt;
                    select.appendChild(el);
                }
            })
            .catch(err => console.log(err));
    });
};

init();


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

    var category = select.options[select.selectedIndex].text;
    if (category === "Choose a category:") {
        alert("Please select a category to use autofill!");
        return;
    }

    const bestcard_url = "https://cardcierge.herokuapp.com/getbestcard";

    var formBody = "category=" + category;

    chrome.storage.local.get('auth_token', function (result) {
        console.log(result.auth_token);
        fetch(bestcard_url, {
            method: 'POST',
            headers: {
                'Authorization': 'Token ' + result.auth_token,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody
        })
            .then(res => res.json())
            .then(resJson => {
                chrome.tabs.executeScript({
                    code: 'var optimalCard = ' + JSON.stringify(resJson)
                }, function () {
                    chrome.tabs.executeScript({ file: '/scripts/autofill.js' });
                });

                var message = "Here is the optimal card we chose: \nCard #: " +
                    resJson.card_number +
                    "\nExpiration: " + 
                    resJson.expiration + 
                    "\nCVV: " + 
                    resJson.security_code;

                // TODO - add styling to /html/display-card-info.html
                // TODO - maybe also add close button?
                // This is actually sort of awkward - I personally like the alert better since its cleaner
                chrome.windows.create({
                    url: '/html/display-card-info.html',
                    width: 450,
                    height: 125,
                    type: "popup",
                    focused: true,
                    top: 400,
                    left: 400
                });
                
                // TODO - check to see if this is a security issue
                chrome.storage.local.set({ "optimal_cc": message});

            })
            .catch(err => console.log(err));
    });
});
