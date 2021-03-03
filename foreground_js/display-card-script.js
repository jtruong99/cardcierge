var close_button = document.getElementById('exit_window')

chrome.storage.local.get('optimal_cc', function (result) {
    
    result = result.optimal_cc

    var c_type = document.getElementById('c_type');
    c_type.value = result.card_type_str

    var c_number = document.getElementById('c_number');
    c_number.value = result.card_number

    var c_code = document.getElementById('c_code');
    c_code.value = result.security_code
    
    var c_expir = document.getElementById('c_expir');
    c_expir.value = result.expiration

    none_obj = {} 
    chrome.storage.local.set({ "optimal_cc": none_obj});
});


close_button.addEventListener('click', () => {
    chrome.windows.getLastFocused(function (tab) {
        console.log(tab)
        chrome.windows.remove(tab.id, function () {});
    });
}); 