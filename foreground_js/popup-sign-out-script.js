const sign_out = document.getElementById('sign_out');
const fill_button = document.getElementById('autofill');
const manage_card_button = document.getElementById("mangage_card");
const select = document.getElementById("selectCategory");

function init(){
    getData("categories/","GET",null).then(resJson => {
        if (!(resJson === false || resJson === "invalid-token")){
            for (var entry in resJson) {
                var opt = resJson[entry].name;
                var el = document.createElement("option");
                el.text = opt;
                el.value = opt;
                select.appendChild(el);
            }
        }
    })
    .catch(err => { console.log(err)});
}

init();


chrome.runtime.sendMessage({ message: 'userStatus' },
    function (response) {
        console.log('we got a response', response);
        if (response.message === 'success') {
            document.getElementById('name').innerText =
                `Welcome back, ${response.email}`;
        }
    }
);


manage_card_button.addEventListener('click', () => {
    chrome.browserAction.setPopup({
        popup: '/html/popup-manage-cc.html'
    });
    window.location.replace('/html/popup-manage-cc.html');  
});

sign_out.addEventListener('click', () => {
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

    var category_id = select.options[select.selectedIndex].id;
    if (category_id === "default_option") {
        alert("Please select a category to use autofill!");
        return;
    }
    category_val = select.options[select.selectedIndex].text
    getData("getbestcard","POST",{category:category_val}).then(resJson => {

        if (!(resJson === false || resJson === "invalid-token")){

            getData("credit_types/","GET",null).then(cc_types => {

                if (!(cc_types === false || cc_types === "invalid-token")){ 
                    
                    chrome.tabs.executeScript({
                        code: 'var optimalCard = ' + JSON.stringify(resJson)
                    }, function () {
                        chrome.tabs.executeScript({ file: '/scripts/autofill.js' });
                    });

          
                    for (var i = 0; i < cc_types.length; i++){
                        var cct = cc_types[i]
                        if (resJson.card_type.toString() === cct.id.toString()){
                            card_type_str = cct.issuer +", "+cct.name;
                            break
                        }
                    }
                   
                    
                    var card_info = {
                        card_number: resJson.card_number, 
                        expiration: resJson.expiration, 
                        security_code: resJson.security_code,
                        card_type_str: card_type_str, 
                    }
                    
                    chrome.windows.create({
                        url: '/html/display-card-info.html',
                        width: 350,
                        height: 400,
                        type: "popup",
                        focused: true,
                        top: 0,
                        left: 0
                    });
                    
                    // TODO - check to see if this is a security issue
                    chrome.storage.local.set({ "optimal_cc": card_info});
                }

            })

        }
    })
    .catch(err => console.log(err));
    
}); 
