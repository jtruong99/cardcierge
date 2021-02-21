/* this script is executed everytime extension is loaded or reloaded
and runs in the background, listing for events (such as click on extension) */

// to see the logs for this script, we need to click on the "inspect views background page"
// link on the chrome extension manager
console.log("Hello from the background page!");

// base url for heroku 
let base_url = "https://cardcierge.herokuapp.com/";

// tells us whether the user is currently signed in
let user_signed_in = false; 

/* this gets run as soon as the extension is loaded
we care to see if the user is signed in, and if so set the 
above variable accordingly */
is_user_signed_in()
  .then(res => {
    if (res.userLoggedIn) user_signed_in = true;
  })
  .catch(err => console.log(err));

/**
 * Checks to see if user is signed in - checks local storage for token
 * @return Promise containing JSON with keys userLoggedIn (true/false),
 *          token (string, which can be empty if not logged in), and
 *          email (username) (string, provided when user logged in)     
 */
function is_user_signed_in() {
  return new Promise(resolve => {
    chrome.storage.local.get(['auth_token', 'email'],
      function (response) {
        // handle case when fetch fails
        if (chrome.runtime.lastError) {
          resolve({ userLoggedIn: false, token: '' });
        }
        resolve(
          // check to make sure it is not a blank object that is returned
          response.auth_token === undefined ?
            { userLoggedIn: false, token: '', email: response.email } :
            { userLoggedIn: true, token: response.auth_token, email: response.email }
        )
      })
  })
}

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

/*
makes an api call to a given url, assuming user is authenticated 
*/
function makeApiCall(endpoint, request_type, data){
  return is_user_signed_in()
    .then(res => {
      if (res.userLoggedIn) {
        //user logged in 
        var user_token = res.token;
        return fetch(base_url+endpoint, {
          method: request_type,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Token '+user_token,
          },
          body: data, 
        })
          .then(res => {
            if (res.status >= 300){
              return false; 
            }else{
              return res.json();
            }
          })
          .catch(err => {
            console.log(err)
          });
      } else {
        return false;
      }
    })
    .catch(err => {
      console.log(err)
      return false;
    });
}

/**
 * Attempts to register a user given email and password
 * @param JSON user_info - contains two keys: username and password
 * @return Promise with info on whether the registration succeeded or failed
 *        registration can fail because of API error, or because username is taken  
 */
function register_user(user_info) {
  const register_url = "https://cardcierge.herokuapp.com/account/register";
  // encode passed username and password into a form body string
  var formBody = [];
  for (var property in user_info) {
    var encodedKey = encodeURIComponent(property);
    var encodedValue = encodeURIComponent(user_info[property]);
    formBody.push(encodedKey + "=" + encodedValue);
  }
  formBody = formBody.join("&");

  return fetch(register_url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody
  })
    .then(res => res.json()) // its possible we can handle 
    .then(resJson => {
      console.log(resJson);

      return new Promise(resolve => {
        if (!resJson.hasOwnProperty('username')) { // if no id returned, something failed, probably network fail
          resolve('fail');
        }
        else if (typeof resJson['username'] !== 'string') { // has username but its not a string 
          resolve('username exists');
        }
        else {
          resolve('success');
        }
      })
    })
    .catch(err => console.log(err));
}

/**
 * Signs user in if signed out; signs user out if signed in
 * @param bool signIn - true if trying to sign in, false if trying to sign out
 * @user_info JSON of username and password credentials if trying to sign in
 * @return Promise on whether attempt succeeded or failed 
 */
function flip_user_status(signIn, user_info) {
  const token_url = "https://cardcierge.herokuapp.com/token/obtain";
  if (signIn) {
    // encode passed username and password into a form body string
    var formBody = [];
    for (var property in user_info) {
      var encodedKey = encodeURIComponent(property);
      var encodedValue = encodeURIComponent(user_info[property]);
      formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");

    return fetch(token_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody
    })
      .then(res => res.json()) // turns result into json - this shit is wack and wasted 3 hours of my life
      .then(resJson => {
        return new Promise(resolve => {
          if (!resJson.hasOwnProperty('token')) {
            console.log("From the background - sign in attempt failed");
            resolve('fail');
          }
          else { // this should be success
            // try to store token 
            console.log("userinfo", user_info);
            chrome.storage.local.set({ "auth_token": resJson["token"], "email": user_info["username"] }, function (response) {
              if (chrome.runtime.lastError) resolve('fail');
              user_signed_in = true;
              console.log("From the background - sign in attempt success, stored token and email");
              resolve('success');
            });
          }
        })
      })
      .catch(err => console.log(err));
  } 
  else if (!signIn) {
    // sign the user out here - we just clear the memory, but this probably should be an API call to logout
    return new Promise(resolve => {
      chrome.storage.local.remove(['auth_token', 'email'], function (response) {
        if (chrome.runtime.lastError) {
          console.log("From the background - sign out failed");
          resolve('fail');
        }
        else {
          user_signed_in = false;
          console.log("From the background - sign out success - deleted credentials");
          resolve('success');
        }
      });
    });
  }
}

/* This listens for messages from the webpage (foreground) of the extension. 
When some action happens there, a message is send to the background (here), 
and we parse that method to determine what to do with it. */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // user is trying to login 
  if (request.message === 'login') {
    console.log("got a login message", request.payload);
    flip_user_status(true, request.payload)
      .then(res => sendResponse(res))
      .catch(err => console.log(err));
    return true;
  }
  // user is trying to logout 
  else if (request.message === 'logout') {
    flip_user_status(false, null)
      .then(res => sendResponse(res))
      .catch(err => console.log(err));
    return true;
  }
  // user trying to register
  else if (request.message === 'register') {
    register_user(request.payload)
      .then(res => sendResponse(res))
      .catch(err => console.log(err));
    return true;
  }
  // just trying to get the status of the user 
  else if (request.message === 'userStatus') {
    is_user_signed_in()
      .then(res => {
        sendResponse({
          message: 'success',
          userStatus: res.user_status,
          token: res.token,
          email: res.email
        });
      })
      .catch(err => console.log(err));
    return true;
  }
  else if (request.message === 'getCreditCards'){
    makeApiCall("creditcards/","GET",null).then(res => {
      var message = 'success';
      if (res === false){
        message = 'err';
      }
      user_cc = res
      makeApiCall("credit_types/","GET",null).then(res => {
        if (res === false){
          message = 'err';
        }
        cc_types = res
        sendResponse({
          message: message,
          user_cc: user_cc,
          cc_types: cc_types,
        });
      })
    })
    .catch(err => console.log(err));
    return true; 
  }
  else if (request.message === 'CreateCreditCard'){
    var body_data = request.payload
    delete body_data["card_id"]
    body_data = convert_payload(body_data)
    makeApiCall("creditcards/","POST",body_data).then(res => {
      var message = 'success';
      if (res === false){
        message = 'err';
      }
      sendResponse({message: message,});
    })
    .catch(err => console.log(err));
    return true; 
  }
  else if (request.message === 'UpdateCreditCard'){
    var body_data = request.payload
    card_id = body_data["card_id"]
    delete body_data["card_id"]
    body_data = convert_payload(body_data)
    makeApiCall(`creditcards/${card_id}/`,"PATCH",body_data).then(res => {
      var message = 'success';
      if (res === false){
        message = 'err';
      }
      sendResponse({message: message,});
    })
    .catch(err => {console.log(err)});
    return true; 
  }  
  else if (request.message === 'DeleteCreditCard'){
    var body_data = request.payload
    card_id = body_data["card_id"]
    delete body_data["card_id"]
    body_data = convert_payload(body_data)
    makeApiCall(`creditcards/${card_id}/`,"DELETE",body_data).then(res => {
      var message = 'success';
      if (res === false){
        message = 'err';
      }
      sendResponse({message: message,});
    })
    .catch(err => console.log(err));
    return true; 
  }

});




