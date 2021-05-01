const sign_out = document.getElementById('sign_out');
const fill_button = document.getElementById('autofill');
const manage_card_button = document.getElementById("mangage_card");
const select = document.getElementById("selectCategory");

function init(){
    chrome.storage.local.get(['page_url'], function (result) {
        getData("infercategory","POST",{url:result.page_url}, true).then(json_category => {         
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
                if(json_category.category !== "other" && json_category.category !== "invalid-token"){
                    select.value = json_category.category
                }
            })
            .catch(err => { console.log(err)});
        })

    });   
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
    get_best_card_and_inject(category_val) 
    
    
}); 
