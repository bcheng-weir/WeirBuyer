angular.module( 'orderCloud' )
    .filter( 'customerPresearch', customerPresearch )
    .filter( 'serialPreSearch', serialPreSearch )
    .filter( 'tagPreSearch', tagPreSearch )
    .filter( 'partPreSearch', partPreSearch )
    .filter( 'serialnumber', serialnumber )
    .filter( 'searchresults', searchresults )
    .filter('weirdate', weirdate)
    .filter('weirfulldate', weirfulldate)
	.filter('weirGroupFromBuyersID', weirGroupFromBuyersID)
	.filter('reverseComments',reverseComments)
    .filter('MaskedQuoteID',MaskedQuoteID)
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
		0: 'Janv',
		1: 'Févr',
		2: 'Mars',
		3: 'Avril',
		4: 'Mai',
		5: 'Juin',
		6: 'Juil',
		7: 'Août',
		8: 'Sept',
		9: 'Oct',
		10: 'Nov',
		11: 'Déc'
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

function weirGroupFromBuyersID() {
	return function (currentBuyerID) {
		if(currentBuyerID) {
			return currentBuyerID.substring(0, 5);
		} else {
			return currentBuyerID;
		}
	}
}

function reverseComments(Underscore) {
	return function(comments) {
		if(comments && comments.length) {
			return Underscore.sortBy(comments, 'date').reverse();
		}
	}
}

function MaskedQuoteID() {
    return function(serialNumber) {
        var fields = serialNumber.split("-");
        if (fields.length < 3) {
            return serialNumber;
        } else if (fields.length == 3) {
            return fields[2];
        } else {
            return fields[2] + "-" + fields[3]; //This gets the revision
        }
    }
}