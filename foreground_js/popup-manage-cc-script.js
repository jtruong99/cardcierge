var back_button = document.getElementById("back")
var toggle_server = document.getElementById("toggle_server")
const original_button_color = back_button.style.backgroundColor;
var credit_card_types; 
var user_credit_cards;
var signup_bonuses; 

function init(){


    //set the state of toggle 
    chrome.storage.local.get('store_local', function(result) {
        toggle_server.checked = result.store_local
    })

    //Get Credit Card Info 
    getData("creditcards/","GET",null).then(cc_user => {
        if (!(cc_user === false || cc_user === "invalid-token")){
            getData("credit_types/","GET",null).then(cc_types => {
                    if (!(cc_types === false || cc_types === "invalid-token")){
                        getData("subs/","GET",null).then(sign_up => {
                            if(!(sign_up === false || sign_up === "invalid-token")){
                                credit_card_types = cc_types;
                                user_credit_cards = cc_user;
                                signup_bonuses = sign_up
                                populate_create_form().then(res => {
                                    populate_table().then(res => {
                                        populate_create_bonus_form().then(res => {
                                            chrome.storage.local.get('store_local', function(result) {
                                                if (result.store_local === false){
                                                    populate_bonus_table().then(res => {
                                                        back_button.removeAttribute("hidden");
                                                    })
                                                }else{
                                                    back_button.removeAttribute("hidden");
                                                }
                                            })
                                        })

                                    })
                                })
                            }

                        });
                        
                    }
                })
        }

    });
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

//toggle server logic 

function refresh_page(){
    chrome.browserAction.setPopup({
        popup: '/html/popup-manage-cc.html'
    });
    window.location.replace('/html/popup-manage-cc.html'); 
}

toggle_server.addEventListener('click', () => {
    if (toggle_server.checked){
        chrome.storage.local.set({'store_local': true}, function () {
            getData("flipuserstorage", "POST", {}).then(res => {
                if (!(res === false || res === "invalid-token")){
                    copy_server_local(res).then(sucess => {
                        refresh_page()
                    })
                }
            })
        })
    }else{
        chrome.storage.local.set({'store_local': false}, function () {
            getData("flipuserstorage", "POST", {}).then(res => {
                if (!(res === false || res === "invalid-token")){
                    clear_local_data().then(success => {
                        refresh_page()
                    })
                }
            })
        })
    }
})

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

    getData(URL,REQ_TYPE,form_data).then(res => {
        if (!(res === false || res === "invalid-token")){      
            alert("Success!");
            refresh_page()
        }
    });
}

function handle_bonus_pressed(button_type, props){


    chrome.storage.local.get('store_local', function(result) {

        if(result.store_local === false){

            var form_data = serialize_form(props["form_id"]);
            var card_id = user_credit_cards[form_data["card_id"]].id //its an index remember!
            delete form_data["card_id"]
            REQ_TYPE = "PATCH"
            URL = `creditcards/${card_id}/`
            send_data = {}
            if (button_type === "CREATE"){
                send_data = form_data
            }else if(button_type === "DELETE"){  
                send_data["welcome_offer"] = ""
                send_data["open_date"] = "" 
            }
        
            getData(URL,REQ_TYPE,send_data).then(res => {
                if (!(res === false || res === "invalid-token")){      
                    alert("Success!");
                    refresh_page()
                }
            });

        }else{

            alert("Unfortunately this feature only works if information is not stored locally. Please update your settings!")

        }

    })

}

function get_card_type_info_from_id(id){
    for (var j = 0; j < credit_card_types.length; j++){
        if (credit_card_types[j].id.toString() === id.toString()){
            return credit_card_types[j];
        }
    }
}

function clear_options(select){
    var length = select.options.length;
    for (var i = length-1; i >= 0; i--) {
        select.options[i] = null;
    }
}

function filter_bonus_by_card_type(card_type){
    bonus_list = [] 
    for (var j = 0; j < signup_bonuses.length; j++){
        sub = signup_bonuses[j]
        if(sub.card_type.toString() === card_type.toString()){
            bonus_list.push(signup_bonuses[j])
        }
    }
    return bonus_list
}

function get_bonus_by_id(id){
    for (var j = 0; j < signup_bonuses.length; j++){
        sub = signup_bonuses[j]
        if(sub.id.toString() === id.toString()){
            return sub 
        }
    }
}
//////////////////////////////////////////////////////////////////

function populate_create_bonus_form(){
    return fetch('/templates/bonus_view.html')

    .then(response => response.text())
    .then(text => {
        bonus_div = document.getElementById("welcome_offer_showcase");
        let i = -1;
        let props = {
            form_id: `${i}_bonus_form`,
            input_field_class: `${i}_bonus_input`,
            cc_id_field: `${i}_bonus_cc_id`,
            welcome_id_field:`${i}_bonus_welcome_id`,
            open_date: "",
            but_del: `${i}_bonus_bdel`,
            but_create: `${i}_bonus_bcreate`,
        };
        template_js = template_str(text, props);
        new_card = htmlToElement(template_js);
        bonus_div.appendChild(new_card); 

        //select field 1
        select_user_cc = document.getElementById(props["cc_id_field"]);
        for (var j = 0; j < user_credit_cards.length; j++){
            
            var user_cc = user_credit_cards[j]; 
            var type_info = get_card_type_info_from_id(user_cc.card_type)
            var card_number_str = user_cc.card_number.toString()
            var last_4 = card_number_str.substr(card_number_str.length - 4)

            var option = document.createElement("option");
            option.text = type_info.name + ", ending in " + last_4;
            option.value = j; //store index ins user_credit_cards 
            select_user_cc.add(option);
        }

        //select field 2
        select_bonus = document.getElementById(props["welcome_id_field"]);

        select_user_cc.addEventListener("change",function() {
            clear_options(select_bonus)
            var user_cc =  user_credit_cards[select_user_cc.value]
            let filter_list_of_bonus = filter_bonus_by_card_type(user_cc.card_type)

            for (var j = 0; j < filter_list_of_bonus.length; j++){
                var sign_up = filter_list_of_bonus[j]; 
                var option = document.createElement("option");
                option.text = "Spend " + sign_up.spend_amount + ", get " + sign_up.bonus_amount;
                option.value = sign_up.id;
                select_bonus.add(option);
            }
        }); 
        
        //manual buttons
        let del_button = document.getElementById(props["but_del"]);
        del_button.setAttribute("hidden",true);
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
            handle_bonus_pressed("CREATE", props);
        });

    })
}

function populate_bonus_table(){

    return fetch('/templates/bonus_view.html')
    .then(response => response.text())
    .then(text => {
        bonus_div = document.getElementById("welcome_offer_showcase");

        for (var j = 0; j < user_credit_cards.length; j++){
            let cc = user_credit_cards[j]
            if (cc.welcome_offer != null){

                console.log("Woohoo offer")
                let props = {
                    form_id: `${j}_bonus_form`,
                    input_field_class: `${j}_bonus_input`,
                    cc_id_field: `${j}_bonus_cc_id`,
                    welcome_id_field:`${j}_bonus_welcome_id`,
                    open_date: cc.open_date,
                    but_del: `${j}_bonus_bdel`,
                    but_create: `${j}_bonus_bcreate`,
                };
                template_js = template_str(text, props);
                new_card = htmlToElement(template_js);
                bonus_div.appendChild(new_card);  

                select_user_cc = document.getElementById(props["cc_id_field"]);

                //set card info 
                var type_info = get_card_type_info_from_id(cc.card_type)
                var card_number_str = cc.card_number.toString()
                var last_4 = card_number_str.substr(card_number_str.length - 4)

                var option = document.createElement("option");
                option.text = type_info.name + ", ending in " + last_4;
                option.value = j; //store index in user_credit_cards 
                select_user_cc.add(option);
                select_user_cc.value = j 

                //set bonus info 
                select_bonus = document.getElementById(props["welcome_id_field"]);

                var sign_up = get_bonus_by_id(cc.welcome_offer); 
                var option = document.createElement("option");
                option.text = "Spend " + sign_up.spend_amount + ", get " + sign_up.bonus_amount;
                option.value = sign_up.id;
                select_bonus.add(option);
                
                select_bonus.value = cc.welcome_offer

                //manual buttons
                let del_button = document.getElementById(props["but_del"]);
                del_button.removeAttribute("hidden");
                let create_button = document.getElementById(props["but_create"]);
                create_button.setAttribute("hidden",true);

                //delete button
                del_button.addEventListener('click', function() {
                    handle_bonus_pressed("DELETE", props);
                });





            }
 


        }

        
    })
}

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

