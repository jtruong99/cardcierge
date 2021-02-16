const button = document.querySelector('button');

button.addEventListener('mouseover', () => {
    button.style.backgroundColor = 'black';
    button.style.color = 'white';
    button.style.transform = 'scale(1.1)';
});

button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = '#f5c2e0';
    button.style.color = 'black';
    button.style.transform = 'scale(1)';

    document.querySelector('form').style.backgroundColor = '#dfbbf7';

    document.querySelector('#email').classList.remove('white_placeholder');
    document.querySelector('#password').classList.remove('white_placeholder');

    document.querySelectorAll('input').forEach(input => {
        input.style.backgroundColor = 'white';
        input.style.color = 'black';
        input.style.transform = 'scale(1)';
    });
});

// basically listen for when the submit is pressed 
document.querySelector('form').addEventListener('submit', event => {
    event.preventDefault(); // prevents user from submitting blank form

    const username = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;

    // TODO - change html type from text to email to enforce correct email form 

    if (username && password) {
        // send message to background script with email and password
        chrome.runtime.sendMessage({
            message: 'login',
            payload: { username, password }
        },
            function (response) {
                if (response === 'success') {
                    chrome.browserAction.setPopup({
                        popup: './popup-sign-out.html'
                    });
                    window.location.replace('./popup-sign-out.html');
                    console.log("message sent back, login success");
                }
                else if (response === 'fail') {
                    console.log("message sent back, failed login");
                    document.querySelector('#password').style.backgroundColor = 'red';
                    document.querySelector('#password').classList.add('white_placeholder');
                }
            }
        );
    }
    else {
        document.querySelector('#email').placeholder = "Enter an email.";
        document.querySelector('#password').placeholder = "Enter a password.";
        document.querySelector('#email').style.backgroundColor = 'red';
        document.querySelector('#password').style.backgroundColor = 'red';
        document.querySelector('#email').classList.add('white_placeholder');
        document.querySelector('#password').classList.add('white_placeholder');
    }
});