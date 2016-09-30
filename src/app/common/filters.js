angular.module( 'orderCloud' )
    .filter( 'serialPreSearch', serialPreSearch )
    .filter( 'tagPreSearch', tagPreSearch )
    .filter( 'partPreSearch', partPreSearch )
    .filter( 'serialnumber', serialnumber )
    .filter( 'searchresults', searchresults )
    .filter( 'weirdate', weirdate )
;

function serialnumber() {
    return function(number) {
        return number.substr(0,3) + '-' + number.substr(3,3) + '/' + number.substr(6,4);
    }
}

function serialPreSearch() {
  return function(items, serial) {
    return items.filter(function(category, index, array) {
	return category && category.xp && category.xp.SN && category.xp.SN.indexOf(serial) >= 0;
    });
  };
}

function tagPreSearch() {
  return function(items, tag) {
    return items.filter(function(category, index, array) {
	return category && category.xp && category.xp.TagNumber && category.xp.TagNumber.indexOf(tag) >= 0;
    });
  };
}
function partPreSearch() {
  return function(items, partno) {
    return items.filter(function(part, index, array) {
	return part && part.Name && part.Name.indexOf(partno) >= 0;
    });
  };
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
