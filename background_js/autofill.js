function fill_info() {
    console.log("Script properly injected into page");

    console.log(optimalCard);

    // optimal card has the following keys: id, owner, card_number, expiration, security_code, card_type

    // TODO - look at more websites and modify these regexes 
    let cc_re = new RegExp('(.*cc.*)|(.*credit.*)|(.*card.*)|(.*num.*)');
    let exp_mm_re = new RegExp('(.*mm.*)|(.*month.*)|(.*MM.*)');
    let exp_yy_re = new RegExp('(.*yy.*)|(.*year.*)|(.*YY.*)');
    let cvv_re = new RegExp('.*cvv.*');

    /* here we are assuming that the cc fields are stored in a form
    this is true in most cases
    in some cases the expiration is in the form of select and not inputs
    TODO - fix this to address possible form cases */
    var all_forms = document.forms
    for (var form of all_forms) {
        var inputs = form.querySelectorAll('input');
        for (var input of inputs) {
            if (input.id.match(cc_re) !== null) {
                input.value = optimalCard.card_number;
            }
            else if (input.id.match(exp_mm_re) !== null) {
                // TODO - we should probably pass the month and year in as different values 
                input.value = optimalCard.expiration.split('/')[0];
            }
            else if (input.id.match(exp_yy_re) !== null) {
                input.value = optimalCard.expiration.split('/')[1];
            }
            else if (input.id.match(cvv_re) !== null) {
                input.value = optimalCard.security_code;
            }
        }
    }
}   

// making this a function is actually important - otherwise we run into 
// redeclaaration bug when trying to autofill twice in a row
fill_info();