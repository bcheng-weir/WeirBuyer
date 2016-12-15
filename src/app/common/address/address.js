angular.module('ordercloud-address', [])
    .directive('ordercloudAddressForm', AddressFormDirective)
    .directive('ordercloudAddressInfo', AddressInfoDirective)
    .filter('address', AddressFilter)
;

function AddressFormDirective(OCGeography, WeirService, $sce) {
    var template = WeirService.Locale() == "fr" ? "common/address/templates/addressFR.form.tpl.html" : "common/address/templates/addressUK.form.tpl.html";
    var labels = {
        en: {
            AddressName:"Address Name",
            CompanyName:"Company Name",
            FirstName:"First Name",
            LastName:"Last Name",
            StreetOne: "Street 1",
            StreetTwo: "Street 2",
            City: "City",
            County: "County",
            PostCode: "Post Code",
            Country: "Country",
            PhoneNumber: "Phone Number"
        },
        fr: {
            AddressName: $sce.trustAsHtml("Nom de l'adresse"),
            CompanyName: $sce.trustAsHtml("Nom de l'entreprise"),
            FirstName: $sce.trustAsHtml("Prénom"),
            LastName: $sce.trustAsHtml("Nom"),
            StreetOne: $sce.trustAsHtml("Rue 1"),
            StreetTwo: $sce.trustAsHtml("Rue 2"),
            City: $sce.trustAsHtml("Ville"),
            County: $sce.trustAsHtml("Région"),
            PostCode: $sce.trustAsHtml("Code postal"),
            Country: $sce.trustAsHtml("Pays"),
            PhoneNumber: $sce.trustAsHtml("Numéro de télephone")
        }
    };
    return {
        restrict: 'E',
        scope: {
            address: '=',
            isbilling: '='
        },
        templateUrl: template,
        link: function(scope) {
            scope.countries = OCGeography.Countries;
            scope.states = OCGeography.States;
            scope.labels = labels[WeirService.Locale()];
        }
    };
}

function AddressInfoDirective() {
    return {
        restrict: 'E',
        scope: {
            addressid: '@'
        },
        templateUrl: 'common/address/templates/address.info.tpl.html',
        controller: 'AddressInfoCtrl',
        controllerAs: 'addressInfo'
    };
}

function AddressFilter() {
    return function(address, option) {
        if (!address) return null;
        if (option === 'full') {
            var result = [];
            if (address.AddressName) {
                result.push(address.AddressName);
            }
            result.push((address.FirstName ? address.FirstName + ' ' : '') + address.LastName);
            result.push(address.Street1);
            if (address.Street2) {
                result.push(address.Street2);
            }
            result.push(address.City + ', ' + address.State + ' ' + address.Zip);
            return result.join('\n');
        }
        else {
            return address.Street1 + (address.Street2 ? ', ' + address.Street2 : '');
        }
    }
}
