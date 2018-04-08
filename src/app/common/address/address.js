angular.module('ordercloud-address', [])
    .directive('ordercloudAddressForm', AddressFormDirective)
    .controller('AddressFrmCntrl',AddressFormController)
    .directive('ordercloudAddressInfo', AddressInfoDirective)
    .filter('address', AddressFilter)
    .directive('selectShippingAddress',SelectShippingAddress)
    .controller('SelectShippingController',SelectShippingController)
;

function AddressFormController(OCGeography, $sce, WeirService) {
    //This controller was added bacuse I could not figure out how to get the OCGeo countries to work in the
    // AddressFormDirective link. I removed the link and instead added this controller.
    // the address is passed in via the muquote delivery template:
    // <ordercloud-address-form address="NewAddressModal.address"></ordercloud-address-form>
    // this sets the xp active=true and priamry=false. The address is submitted when the submit button on the modal is
    // clicked. It closes the form and finishes the function _customShipping. The close dismisses the modal without
    // continuing.
    var vm = this;
    var labels = {
        en: {
            AddressName:"Address Name",
            CompanyName:"Company Name",
            FirstName:"First Name",
            LastName:"Last Name",
            StreetOne: "Address line 1",
            StreetTwo: "Address line 2",
            StreetThree: "Address line 3",
            City: "City",
            County: "State / Province / Region",
            PostCode: "Postalcode / Zip code",
            Country: "Country",
            PhoneNumber: "Phone Number"
        },
        fr: {
            AddressName: $sce.trustAsHtml("Nom de l'adresse"),
            CompanyName: $sce.trustAsHtml("Nom de l'entreprise"),
            FirstName: $sce.trustAsHtml("Prénom"),
            LastName: $sce.trustAsHtml("Nom"),
            StreetOne: $sce.trustAsHtml("Adresse ligne 1"),
            StreetTwo: $sce.trustAsHtml("Adresse ligne 2"),
            StreetThree: $sce.trustAsHtml("Adresse ligne 3"),
            City: $sce.trustAsHtml("Ville"),
            County: $sce.trustAsHtml("Departement / Province / Région"),
            PostCode: $sce.trustAsHtml("Code Postal / Zip code"),
            Country: $sce.trustAsHtml("Pays"),
            PhoneNumber: $sce.trustAsHtml("Numéro de télephone")
        }
    };
    OCGeography.Countries()
        .then(function(countries) {
            vm.countries = countries;
        });
    vm.states = OCGeography.States;
    vm.labels = labels[WeirService.Locale()];
}

function AddressFormDirective(OCGeography, WeirService, $sce) {
    var template = WeirService.Locale() == "fr" ? "common/address/templates/addressFR.form.tpl.html" : "common/address/templates/addressUK.form.tpl.html";

    return {
        restrict: 'E',
        scope: {
            address: '=',
            isbilling: '='
        },
        templateUrl: template,
        controller: 'AddressFrmCntrl',
        controllerAs: 'adrsFrm'
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

function SelectShippingController(Underscore, $scope, $sce, $uibModal, WeirService, OrderCloudSDK, Me, toastr) {
    var vm = this;

    var labels = {
        en: {
            DefaultAddress: "Your Default Address",
            DeliverHere: "Deliver to this Address",
            AddNew: $sce.trustAsHtml("<i class='fa fa-plus-circle'></i> Add a New Address")
        },
        fr: {
            DefaultAddress: $sce.trustAsHtml("Votre adresse par d&eacute;faut"),
            DeliverHere: $sce.trustAsHtml("Livrer &agrave; cette adresse"),
            AddNew: $sce.trustAsHtml("<i class='fa fa-plus-circle'></i> Ajouter une nouvelle adresse")
        }
    };

    vm.labels = WeirService.LocaleResources(labels);

    vm.setShippingAddress = function(address) {
        $scope.address = address;
        vm.address = address;
    };

    var activeAddress = function (address) {
        return address.xp.active === true;
    };

    vm.addresses = Underscore.sortBy($scope.addresses.Items, function (address) {
        return address.xp.primary;
    }).filter(activeAddress).reverse();

    for (var i in vm.addresses) {
        if(vm.addresses[i].xp && vm.addresses[i].xp.primary === true) {
            vm.setShippingAddress(vm.addresses[i]);
        }
    }

    vm.country = function (c) {
        var result = Underscore.findWhere($scope.countries, { code: c });
        return result ? result.name : '';
    };

    vm.ChunkedData = _chunkData(vm.addresses, 2);
    function _chunkData(arr, size) {
        var newArray = [];
        for (var i = 0; i < arr.length; i += size) {
            newArray.push(arr.slice(i, i + size));
        }
        return newArray;
    }

    vm.CustomShipping = function () {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: 'newEnquiryAddress.html',
            controller: 'NewEnquiryAddressModalCtrl',
            controllerAs: 'NewEnquiryAddressModal',
            size: 'lg'
        });

        var newAddressResults = {};
        modalInstance.result
            .then(function (address) {
                return OrderCloudSDK.Addresses.Create(Me.GetBuyerID(), address);
            })
            .then(function (newAddress) {
                vm.addresses.push(newAddress);
                $scope.addresses.Items.push(newAddress);
                vm.ChunkedData.push([newAddress]);
                newAddressResults = newAddress;
                return WeirService.AssignAddressToGroups(newAddressResults.ID);
            })
            .then(function () {
                //$state.go($state.current, {}, {reload: true});
                toastr.success(vm.labels.ShippingAddressSet + newAddressResults.AddressName, vm.labels.ShippingAddressTitle);
            })
            .catch(function (ex) {
                if (ex !== 'cancel') {
                    $exceptionHandler(ex);
                }
            });
    };



}

function SelectShippingAddress() {
    //Given any buyer, choose the selected shipping address.
    //this is for the directive that presents all address, two to a line.
    return {
        restrict: 'AEC',
        scope: {
            countries: '=',
            addresses:'=addresses',
            address:'=address'
        },
        templateUrl: 'common/address/templates/address.choose.shipping.tpl.html',
        controller: 'SelectShippingController',
        controllerAs: 'selectShipping'
    }
}
