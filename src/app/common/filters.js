angular.module( 'orderCloud' )
    .filter( 'customerPresearch', customerPresearch )
    .filter( 'serialPreSearch', serialPreSearch )
    .filter( 'tagPreSearch', tagPreSearch )
    .filter( 'partPreSearch', partPreSearch )
    .filter( 'serialnumber', serialnumber )
    .filter( 'searchresults', searchresults )
    .filter('weirdate', weirdate)
    .filter('weirfulldate', weirfulldate)
;

function serialnumber() {
    return function(number) {
        return number.substr(0,3) + '-' + number.substr(3,3) + '/' + number.substr(6,4);
    }
}

function customerPresearch() {
  return function(items, name) {
    return items.filter(function(cust, index, array) {
		return cust && cust.name && cust.name.toLowerCase().indexOf(name.toLowerCase()) >= 0;
    });
  };
}

function serialPreSearch() {
  return function(items, serial) {
    return items.filter(function(category, index, array) {
	return category && category.xp && category.xp.SN && category.xp.SN.toLowerCase().indexOf(serial.toLowerCase()) >= 0;
    });
  };
}

function tagPreSearch() {
  return function(items, tag) {
    return items.filter(function(category, index, array) {
	return category && category.xp && category.xp.TagNumber && category.xp.TagNumber.toLowerCase().indexOf(tag.toLowerCase()) >= 0;
    });
  };
}
function partPreSearch() {
  return function(items, partno) {
      return items.filter(function (part, index, array) {
          if (!part) return false;
          if (part.Name && part.Name.toLowerCase().indexOf(partno.toLowerCase()) >= 0) {
              part.DisplayName = part.Name;
              return true;
          }
          if (part.xp && part.xp.AlternatePartNumber && part.xp.AlternatePartNumber.toLowerCase().indexOf(partno.toLowerCase()) >= 0) {
              part.DisplayName = part.xp.AlternatePartNumber;
              return true;
          }
          return false;
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

function getMonthText(m, locale) {
    var months = {
	    en: {
		0: 'Jan',
		1: 'Feb',
		2: 'Mar',
		3: 'Apr',
		4: 'May',
		5: 'Jun',
		6: 'Jul',
		7: 'Aug',
		8: 'Sep',
		9: 'Oct',
		10: 'Nov',
		11: 'Dec'
	    },
	    fr: {
		0: 'FR-Jan',
		1: 'FR-Feb',
		2: 'FR-Mar',
		3: 'FR-Apr',
		4: 'FR-May',
		5: 'FR-Jun',
		6: 'FR-Jul',
		7: 'FR-Aug',
		8: 'FR-Sep',
		9: 'FR-Oct',
		10: 'FR-Nov',
		11: 'FR-Dec'
	    }
    };
    switch(locale) {
	    case "fr": return months.fr[m];
	    case "en":
	    default: 
                return months.en[m];
    }
}

function weirdate() {
    return function(date, locale) {
        var result;
	if (date) {
           date = new Date(date);

           var day = date.getDate();
           result = day + '-' + getMonthText(date.getMonth(), locale) + '-' + (date.getFullYear() % 100).toString();
	} else {
	   result = "--";
	}
        return result;
    }
}
function weirfulldate() {
    return function (date, locale) {
        var result;
        if (date) {
            date = new Date(date);

            var day = date.getDate();
            result = day + '-' + getMonthText(date.getMonth(), locale) + '-' + date.getFullYear().toString();
        } else {
            result = "--";
        }
        return result;
    }
}
