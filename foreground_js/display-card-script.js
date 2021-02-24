chrome.storage.local.get('optimal_cc', function (result) {
    const msg = document.getElementById('msg');
    msg.innerText = result.optimal_cc;
});