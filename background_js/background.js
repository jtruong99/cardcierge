/* this script is executed everytime extension is loaded or reloaded
and runs in the background, listing for events (such as click on extension) */

// to see the logs for this script, we need to click on the "inspect views background page"
// link on the chrome extension manager
console.log("Hello from the background page!");

// base url for heroku 
// let base_url = "https://cardcierge.herokuapp.com/";
// let base_url = "http://127.0.0.1:8000/";



// tells us whether the user is currently signed in
let user_signed_in = false; 

//set the default value of cc_array
//each user hashes to a different place in this local storage array 
//depending on their uuid
//since info is hashed no user can access other users info!
chrome.storage.local.get(['user_credit_cards'], function (result) {
  if (!result.user_credit_cards){
    chrome.storage.local.set({'user_credit_cards': {}})
}});

//clear memory on refresh! 
chrome.storage.local.remove(['auth_token', 'email', 'store_local', 'encryption_key', 'uid'])

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

/**
 * Attempts to register a user given email and password
 * @param JSON user_info - contains two keys: username and password
 * @return Promise with info on whether the registration succeeded or failed
 *        registration can fail because of API error, or because username is taken  
 */
function register_user(user_info) {
  const register_url = `${base_url}account/register`;
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
  const token_url = `${base_url}token/obtain`;
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
            chrome.storage.local.set({ "auth_token": resJson["token"], "email": user_info["username"] }, function () {
              if (chrome.runtime.lastError) resolve('fail');
              
              //get the user settings
              fetch(`${base_url}getusersettings`, {
                  method: "GET",
                  headers: {
                      'Content-Type': 'application/x-www-form-urlencoded',
                      'Authorization': 'Token '+resJson["token"],
                  },
              })
              .then(res => {
                  if (res.status == 200){
                    res.json().then(data => {
                      user_signed_in = true;
                      chrome.storage.local.set({ "encryption_key": data["settings"]["key"], "store_local": data["settings"]["store_local"], "uid": data["settings"]["user"] }, function () {
                        console.log("From the background - sign in attempt success, stored userinfo");
                        resolve('success');
                      })
                    })
                  }
                  else{
                    resolve('fail'); 
                  }
              })
              
              // user_signed_in = true;
              // console.log("From the background - sign in attempt success, stored token and email");
              // resolve('success');
            });
          }
        })
      })
      .catch(err => console.log(err));
  } 
  else if (!signIn) {
    // sign the user out here - we just clear the memory, but this probably should be an API call to logout
    return new Promise(resolve => {
      chrome.storage.local.remove(['auth_token', 'email', 'store_local', 'encryption_key', 'uid', 'autofill_tabid','page_tab'], function (response) {
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
});


///////
/////// BACKGROUND LISTERNERS ///////
///////

function handle_page_changed(tab_url, tab_id){

  //check to make sure the tab_url isn't the chrome extension
  //check to see if purhasing url how to do?!?!?
  //look for chekcout, payment, 
  let purchase = new RegExp('(.*purchase.*)|(.*payment.*)');
  let extension = new RegExp('.*chrome-extension.*');

  if (tab_url && tab_url.match(extension) === null){

    chrome.storage.local.set({'page_url': tab_url}, function (){

        if (tab_url.match(purchase) !== null){
          if (window.confirm('Making a purchase? Autofill?'))
            {

              chrome.storage.local.set({'autofill_tabid': tab_id}, function (){

                getData("infercategory","POST",{url:tab_url}, true).then(resJson => {


                    if (resJson === "invalid-token" || resJson.category === "other"){
                      chrome.windows.create({
                        url: '/html/popup-sign-in.html',
                        width: 500,
                        height: 500,
                        type: "popup",
                        focused: true,
                        top: 0,
                        left: 0
                      });
                    }else{
                      get_best_card_and_inject(resJson.category) 
                    }
                  })

              })
          }
        }
      })
    }
}

chrome.tabs.onActivated.addListener(function(activeInfo) {
  chrome.tabs.get(activeInfo.tabId, function(tab){
        handle_page_changed(tab.url, tab.id)
  });
}); 

chrome.tabs.onUpdated.addListener(function
  (tabId, changeInfo, tab) {
      handle_page_changed(changeInfo.url, tabId)
  }
);