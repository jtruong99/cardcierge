var back_button = document.getElementById("back")
const original_button_color = back_button.style.backgroundColor;
var credit_card_types; 
var user_credit_cards;


function init(){

    //only show button once data is loaded!
    back_button.setAttribute("hidden",true);

    //Get Credit Card Info 
    makeApiCall("creditcards/","GET",null).then(cc_user => {
            makeApiCall("credit_types/","GET",null).then(cc_types => {
                if (cc_user === false || cc_types === false){
                    alert("Something Went Wrong")
                }else{
                    credit_card_types = cc_types;
                    user_credit_cards = cc_user;
                    populate_create_form().then(res => {
                        populate_table().then(res => {
                            //now show it!
                            back_button.removeAttribute("hidden");
                        });
                    });
                }
            });
    })
    .catch(err => console.log(err));

}

init() 

//////////////////////////////////////////////////////////////////


function htmlToElement(html) {
    // https://stackoverflow.com/questions/494143/creating-a-new-dom-element-from-an-html-string-using-built-in-dom-methods-or-pro
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}

//useful for our own templater 
function render(props) {
    return function(tok, i) {
        return (i % 2) ? props[tok] : tok;
    };
}

function template_str(text, props){
    //https://stackoverflow.com/questions/18673860/defining-a-html-template-to-append-using-jquery
    spilt_arr = text.split(/\$\{(.+?)\}/g);
    final_res = spilt_arr.map(render(props)).join('')
    return final_res
}
  
function serialize_form(form_id){
    // https://stackoverflow.com/questions/3547035/javascript-getting-html-form-values/41262933
    var elements = document.getElementById(form_id).elements;
    var obj ={};
    for(var i = 0 ; i < elements.length ; i++){
        var item = elements.item(i);
        obj[item.name] = item.value;
    }
    return obj
}

//////////////////////////////////////////////////////////////////

//back button logic 
back_button.addEventListener('click', () => {
    chrome.browserAction.setPopup({
        popup: '/html/popup-sign-out.html'
    });
    window.location.replace('/html/popup-sign-out.html');  
});

function handle_button_pressed(button_type, props){
    var form_data = serialize_form(props["form_id"]);
    var card_id = form_data["card_id"]
    delete form_data["card_id"]

    var REQ_TYPE; 
    var URL; 

    if (button_type === "Create"){
        REQ_TYPE = "POST"
        URL = "creditcards/"
    }else if(button_type === "Update"){
        REQ_TYPE = "PATCH"
        URL = `creditcards/${card_id}/`
    }else if(button_type === "Delete"){
        REQ_TYPE = "DELETE"
        URL = `creditcards/${card_id}/`
    }

    makeApiCall(URL,REQ_TYPE,form_data).then(results => {
        if (results === false){
            alert("Bad Inputs!")
        }else{                
            alert("Success!");
            chrome.browserAction.setPopup({
                popup: '/html/popup-manage-cc.html'
            });
            window.location.replace('/html/popup-manage-cc.html'); 

        }
    });
}

//////////////////////////////////////////////////////////////////


function populate_create_form(){

    return fetch('/templates/cc_view.html')
    .then(response => response.text())
    .then(text => {
        cards_div = document.getElementById("cards_showcase");
        let i = -1;
        let props = {
            form_id: `${i}_cc_form`,
            card_id: 0,
            input_field_class: `${i}_cc_input`,
            cc_type_field: `${i}_cc_type`,
            card_num: "",
            card_code: "",
            expir: "",
            but_save:`${i}_bsave`,
            but_del: `${i}_bdel`,
            but_edit: `${i}_bedit`,
            but_create: `${i}_bcreate`,
        };
        template_js = template_str(text, props);
        new_card = htmlToElement(template_js);
        cards_div.appendChild(new_card);  

        //select field 
        select_cc_type = document.getElementById(props["cc_type_field"]);
        for (var j = 0; j < credit_card_types.length; j++){
            var option = document.createElement("option");
            var cct = credit_card_types[j]; 
            option.text = cct.issuer +", "+cct.name;
            option.value = cct.id;
            select_cc_type.add(option);
        }

        //manual buttons
        let edit_button = document.getElementById(props["but_edit"]);
        edit_button.setAttribute("hidden",true);
        let create_button = document.getElementById(props["but_create"]);
        create_button.removeAttribute("hidden");

        //set active
        input_fields = document.getElementsByClassName(props["input_field_class"])
        for(var j = 0; j < input_fields.length; j++){
            input_fields[j].removeAttribute("readonly");
            input_fields[j].removeAttribute("disabled");
        }

        //create button
        create_button.addEventListener('click', function() {
            handle_button_pressed("Create", props);
        });

    });


}

function populate_table(){
    return fetch('/templates/cc_view.html')
    .then(response => response.text())
    .then(text => {
        cards_div = document.getElementById("cards_showcase");

        for(let i = 0; i < user_credit_cards.length; i++){
            // https://stackoverflow.com/questions/19586137/addeventlistener-using-for-loop-and-passing-values
            // bizzarre issue here is the fix, using let 
                let cc = user_credit_cards[i]
                let props = {
                    form_id: `${i}_cc_form`,
                    card_id: cc.id,
                    input_field_class: `${i}_cc_input`,
                    cc_type_field: `${i}_cc_type`,
                    card_num: cc.card_number,
                    card_code: cc.security_code,
                    expir: cc.expiration,
                    but_save:`${i}_bsave`,
                    but_del: `${i}_bdel`,
                    but_edit: `${i}_bedit`,
                    but_create: `${i}_bcreate`,
                };
                template_js = template_str(text, props);
                new_card = htmlToElement(template_js);
                cards_div.appendChild(new_card);   

                //select field 
                select_cc_type = document.getElementById(props["cc_type_field"]);
                for (var j = 0; j < credit_card_types.length; j++){
                    var option = document.createElement("option");
                    var cct = credit_card_types[j]; 
                    option.text = cct.issuer +", "+cct.name;
                    option.value = cct.id;
                    select_cc_type.add(option);
                }
                select_cc_type.value = cc.card_type; 

                //button fields
                let edit_button = document.getElementById(props["but_edit"]);
                let save_button = document.getElementById(props["but_save"]);
                let delete_button = document.getElementById(props["but_del"]);

                //edit button 
                edit_button.addEventListener('click', function() {

                    save_button.removeAttribute("hidden");
                    delete_button.removeAttribute("hidden");
                    input_fields = document.getElementsByClassName(props["input_field_class"])
                    for(var j = 0; j < input_fields.length; j++){
                        input_fields[j].removeAttribute("readonly");
                        input_fields[j].removeAttribute("disabled");
                    }
                    edit_button.setAttribute("hidden", true);
                 
                });

                //save button 
                save_button.addEventListener('click', function() {
                    handle_button_pressed("Update", props);
                });

                //delete button
                delete_button.addEventListener('click', function() {  
                    handle_button_pressed("Delete", props);
                });
            
        }
    })
}

