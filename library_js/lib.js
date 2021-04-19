//useful api functions! 

let base_url = "https://cardcierge.herokuapp.com/";
// let base_url = "http://127.0.0.1:8000/";
let encrypt_field_list = ["security_code", "expiration", "card_number"]

function convert_payload(payload){
    var formBody = [];
    for (var property in payload) {
      var encodedKey = encodeURIComponent(property);
      var encodedValue = encodeURIComponent(payload[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
    return formBody; 
}



function encrypt_credit_card (cc, key){

    for (var property of encrypt_field_list) {
        var encrypted_field = CryptoJS.AES.encrypt(cc[property], key)
        cc[property] = encrypted_field.toString()
    }
    return cc 
}

function decrypt_credit_card (cc, key) {
    for (var property of encrypt_field_list) {
        var decrypted = CryptoJS.AES.decrypt(cc[property], key)
        cc[property] = decrypted.toString(CryptoJS.enc.Utf8);
    }
    return cc 
}

function copy_server_local(res){
    return new Promise(function(resolve, reject) {
        console.log(res)
        chrome.storage.local.get(['user_credit_cards', 'uid', 'encryption_key'], function (result) {
            result.user_credit_cards[result.uid] = [] 
            for (var i = 0; i < res.length; i++){
                var cc = res[i]
                var encrypted_cc  = encrypt_credit_card(cc, result.encryption_key)
                result.user_credit_cards[result.uid].push(encrypted_cc)
            }
            chrome.storage.local.set({'user_credit_cards':  result.user_credit_cards}, function(){
                resolve(true)
            })
            
        }); 
    });
}

function clear_local_data(){
    return new Promise(function(resolve, reject) {
        chrome.storage.local.get(['user_credit_cards', 'uid', 'encryption_key'], function (result) {
            original_dict = result.user_credit_cards
            original_dict[result.uid] = [] 
            chrome.storage.local.set({'user_credit_cards': original_dict}, function() {
                resolve(true)
            })
        }); 

    }); 

}


function getData(endpoint, request_type, data){
    //need special behavior for the following routes if the user 
    //does not want us to store their information at our servers 

    if (endpoint === "getbestcard"){

        return new Promise(function(resolve, reject) {
            chrome.storage.local.get(['store_local', 'user_credit_cards', 'uid', 'encryption_key'], function (result) {
                if(result.store_local === true){

                    if (result.uid in result.user_credit_cards === false){
                        result.user_credit_cards[result.uid] = [] 
                    }
                    list_of_cc_types = []
                    dict_of_type_to_cc = [] 
                    for (var j = 0; j < result.user_credit_cards[result.uid].length; j++){
                        cc_type = result.user_credit_cards[result.uid][j].card_type
                        list_of_cc_types.push(cc_type)
                        dict_of_type_to_cc[cc_type] = result.user_credit_cards[result.uid][j]
                    }
                    list_of_cc_types = JSON.stringify(list_of_cc_types)
                    var obj = {
                        list_of_cc_types: list_of_cc_types, 
                        category: data["category"]
                    }

                    _makeApiCall("getbestcard",request_type,obj).then(res => {
                        optimal_id = res["optimal_card_type"]
                        opt_cc = decrypt_credit_card(dict_of_type_to_cc[optimal_id], result.encryption_key)
                        resolve(opt_cc)
                    });

                }else{
                    resolve(_makeApiCall("getbestcard",request_type,data))
                }
            })

        })

    }else if (endpoint === "flipuserstorage"){
        //flip the status
        return new Promise(function(resolve, reject) {
            
            
            chrome.storage.local.get(['store_local', 'user_credit_cards', 'uid', 'encryption_key'], function (result) {
                if (result.uid in result.user_credit_cards === false){
                    result.user_credit_cards[result.uid] = [] 
                }
                decrypted_list = []
                for (var j = 0; j < result.user_credit_cards[result.uid].length; j++){
                    decrypted_list.push(decrypt_credit_card(result.user_credit_cards[result.uid][j], result.encryption_key))
                }

                decrypted_list = JSON.stringify(decrypted_list)

                if(result.store_local === true){
                    console.log("setting store_local to true...")
                    var obj = {
                        store_local: true, 
                    }
                }else{
                    console.log("setting store_local to false...")
                    var obj = {
                        user_credit_cards: decrypted_list,
                        store_local: false, 
                    }
                    
                }
                resolve(_makeApiCall("flipuserstorage","POST",obj))
            });
        })


    }
    else if(endpoint.includes("creditcards/")){

        return new Promise(function(resolve, reject) {

            chrome.storage.local.get(['store_local', 'user_credit_cards', 'uid','encryption_key'], function (result) {
                if(result.store_local === true){

                    if (result.uid in result.user_credit_cards === false){
                        result.user_credit_cards[result.uid] = [] 
                    }
                    

                    //decrypt the info! 
                    if (request_type === "GET"){
                        decrypted_list = []
                        for (var j = 0; j < result.user_credit_cards[result.uid].length; j++){
                            decrypted_list.push(decrypt_credit_card(result.user_credit_cards[result.uid][j], result.encryption_key))
                        }
                        resolve(decrypted_list);

                    }else if (request_type === "POST"){
                        //compute an id 
                        var max_id = -1
                        for (var j = 0; j < result.user_credit_cards[result.uid].length; j++){
                            if (result.user_credit_cards[result.uid][j].id > max_id){
                                max_id = result.user_credit_cards[result.uid][j].id
                            }
                        }
                        data["id"] = max_id+1 
                        encrypted_card = encrypt_credit_card(data, result.encryption_key)
                        result.user_credit_cards[result.uid].push(encrypted_card)
                        chrome.storage.local.set({'user_credit_cards': result.user_credit_cards})
                        resolve(result.user_credit_cards);

                    }else if (request_type === "PATCH"){
                        id = endpoint.substring(12)
                        for (var j = 0; j < result.user_credit_cards[result.uid].length; j++){
                            cc = result.user_credit_cards[result.uid][j]
                            if (parseInt(id) === cc.id){
                                cc.card_type = data["card_type"]
                                cc.card_number = data["card_number"]
                                cc.security_code = data["security_code"]
                                cc.expiration = data["expiration"]
                                cc = encrypt_credit_card(cc, result.encryption_key)
                                result.user_credit_cards[result.uid][j] = cc
                                break; 
                            }
                        }
                        chrome.storage.local.set({'user_credit_cards': result.user_credit_cards})
                        resolve(true)
                    }else if (request_type === "DELETE"){
                        id = endpoint.substring(12)
                        for (var j = 0; j < result.user_credit_cards[result.uid].length; j++){
                            cc = result.user_credit_cards[result.uid][j]
                            if (parseInt(id) === cc.id){
                                result.user_credit_cards[result.uid].splice(j, 1);
                                break; 
                            }
                        }
                        chrome.storage.local.set({'user_credit_cards': result.user_credit_cards})
                        resolve(true)
                    }
                }else{
                    resolve(_makeApiCall(endpoint, request_type, data))
                }


            })
        })
    }

        
    return _makeApiCall(endpoint, request_type, data)
    


    
}

function sign_out_user(){
    chrome.runtime.sendMessage({ message: 'logout' },
    function (response) {
        if (response === 'success') {
            chrome.browserAction.setPopup({
                popup: '/html/popup-sign-in.html'
            });
            window.location.replace('/html/popup-sign-in.html');
        }
    });
}


function _makeApiCall(endpoint, request_type, data){

    return new Promise(function(resolve, reject) {
        var body_data = convert_payload(data)
        if (request_type === "GET"){
            body_data = null; 
        } 
        chrome.storage.local.get('auth_token', function (result) {

            var user_token = result.auth_token;
            return fetch(base_url+endpoint, {
                method: request_type,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Token '+user_token,
                },
                body: body_data, 
            })
            .then(res => {
                if (res.status === 401){
                    //bad token redirect them! 
                    alert("Your session expired! Please sign-in again.")
                    sign_out_user() 
                    resolve("invalid-token")
                }
                else if (res.status >= 300){
                    alert("Something went wrong!")
                    resolve(false);
                }
                else if (res.status === 204){
                    //delete no content
                    resolve(true);
                } 
                else{
                    resolve(res.json()); 
                }
            })
            .catch(err => {
                reject(); 
                console.log(err)
            });
        });

    });
}