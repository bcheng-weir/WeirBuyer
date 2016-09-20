angular.module( 'orderCloud' )
    .filter( 'serialnumber', serialnumber )
    .filter( 'searchresults', searchresults )
    .filter( 'weirdate', weirdate )
;

function serialnumber() {
    return function(number) {
        return number.substr(0,3) + '-' + number.substr(3,3) + '/' + number.substr(6,4);
    }
}

function searchresults() {
    return function(numbers, valid) {
        var results = [];

        angular.forEach(numbers, function(number) {
            if (valid && number.Detail) {
                results.push(number);
            }
            else if (!valid && !number.Detail) {
                results.push(number);
            }
        });

        return results;
    }
}

function daySuffix(day) {
    switch(day.toString().slice(-1)) {
        case '1':
            return 'st';
            break;
        case '2':
            return 'nd';
            break;
        case '3':
            return 'rd';
            break;
        default:
            return 'th';
    }
}

function getMonthText(m) {
    var months = {
        0: 'January',
        1: 'February',
        2: 'March',
        3: 'April',
        4: 'May',
        5: 'June',
        6: 'July',
        7: 'August',
        8: 'September',
        9: 'October',
        10: 'November',
        11: 'December'
    };

    return months[m];
}

function weirdate() {
    return function(date) {
        var result;
        date = new Date(date);

        var day = date.getDate();
        result = '<span>' + day + '<sup>' + daySuffix(day) + '</sup>' + ' ' + getMonthText(date.getMonth()) + ' ' + date.getFullYear();

        return result;
    }
}