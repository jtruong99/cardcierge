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

    document.querySelector('form').style.backgroundColor = '#2596be';

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
    event.preventDefault();

    const username = document.querySelector('#email').value;
    const password = document.querySelector('#password').value;
    const password_confirm = document.querySelector('#password_rpt').value;


    if (username && password && password_confirm && (password === password_confirm)) {
        // send message to background script with email and password
        chrome.runtime.sendMessage({
            message: 'register',
            payload: { username, password }
        },
            function (response) {
                if (response === 'success') {
                    window.location.replace('./popup-sign-in.html');
                    console.log("message sent back, register success");
                }
                else if (response === 'fail') {
                    console.log("message sent back, register failed");
                }
                else if (response === 'username exists') {
                    console.log("username exists");
                }
            }
        );
    }
    else {
        document.querySelector('#email').placeholder = "Enter an email.";
        document.querySelector('#password').placeholder = "Enter a password.";
        document.querySelector('#password_rpt').placeholder = "Enter the same password.";
        document.querySelector('#email').style.backgroundColor = 'red';
        document.querySelector('#password').style.backgroundColor = 'red';
        document.querySelector('#password_rpt').style.backgroundColor = 'red';
        document.querySelector('#email').classList.add('white_placeholder');
        document.querySelector('#password').classList.add('white_placeholder');
        document.querySelector('#password_rpt').classList.add('white_placeholder');
    }
});