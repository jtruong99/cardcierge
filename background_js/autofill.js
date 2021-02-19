console.log("Script properly injected into page");

// sometimes it will be in a form, sometimes we can just locate the id... 
// this will take some experimenting to get right 
var form = document.forms[2]
console.log(form)

// this works for the best buy checkout page
let cc = document.querySelector('input[id="optimized-cc-card-number"]');
console.log(cc);

cc.value = 1234567890123456

// sample of using UN and PW autofill
// let usernameInput = form.querySelector( 'input[id="username"]' );
// let passwordInput = form.querySelector( 'input[id="password"]' );
// usernameInput.value = "test";
// passwordInput.value = "TESTPW";