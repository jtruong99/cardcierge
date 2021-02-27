//useful api functions! 

let base_url = "https://cardcierge.herokuapp.com/";

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
  
function makeApiCall(endpoint, request_type, data){
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
                if (res.status >= 300){
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