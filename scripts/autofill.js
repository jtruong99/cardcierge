function fill_info() {
    // optimal card has the following keys: id, owner, card_number, expiration, security_code, card_type

    // TODO - look at more websites and modify these regexes 
    let cc_re = new RegExp('(.*cc.*)|(.*credit.*)|(.*card.*)');
    let exp_mm_re = new RegExp('(.*mm.*)|(.*month.*)|(.*MM.*)');
    let exp_yy_re = new RegExp('(.*yy.*)|(.*year.*)|(.*YY.*)');
    let cvv_re = new RegExp('(.*cvv.*)|(.*security.*)|(.*code.*)');

    /* here we are assuming that the cc fields are stored in a form
    this is true in most cases
    in some cases the expiration is in the form of select and not inputs
    TODO - fix this to address possible form cases */
    // var all_forms = document.forms
    // for (var form of all_forms) {
        inputs = document.getElementsByTagName('input');
        selects = document.getElementsByTagName('select');
        // var inputs = form.querySelectorAll('input');
        // var selects = form.querySelectorAll('select');
        for (var input of inputs) {
            if (input.id.match(cc_re) !== null || input.name.match(cc_re) !== null) {
                input.value = optimalCard.card_number;
            }
            else if (input.id.match(exp_mm_re) !== null || input.name.match(exp_mm_re) !== null) {
                // TODO - we should probably pass the month and year in as different values 
                input.value = optimalCard.expiration.split('/')[0];
            }
            else if (input.id.match(exp_yy_re) !== null || input.name.match(exp_yy_re) !== null) {
                input.value = optimalCard.expiration.split('/')[1];
            }
            else if (input.id.match(cvv_re) !== null || input.name.match(cvv_re) !== null) {
                input.value = optimalCard.security_code;
            }
        }
        for (var select of selects) {

            list_vals = []
            for (var opt of select.options){
                list_vals.push(opt.value)
            }
            
            if (select.id.match(exp_mm_re) !== null || select.name.match(exp_mm_re)){
                var month = optimalCard.expiration.split('/')[0]; 
                if (month.charAt(0) === '0'){
                    month = "" + month.charAt(1) 
                }       
                if (month.length === 1 && list_vals.includes("01")){
                    month = "0"+month
                }
                select.value = month 
            }else if(select.id.match(exp_yy_re) !== null || select.name.match(exp_yy_re) !== null){
                var year = optimalCard.expiration.split('/')[1];
                if (year.length === 2 && list_vals[1].length === 4){
                    year = "20"+year
                }
                select.value = year
            }
        }

    // }
}   

// making this a function is actually important - otherwise we run into 
// redeclaaration bug when trying to autofill twice in a row
fill_info();
