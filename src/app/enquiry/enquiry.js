angular.module('orderCloud')
	.config(EnquiryConfig)
    .service('EnquiryService', EnquiryService)
    .controller('EnquiryCtrl', EnquiryController)
	.controller('EnquiryFilterCtrl', EnquiryFilterController)
	.controller('EnquirySelectCtrl', EnquirySelectController)
	.controller('EnquiryDeliveryCtrl', EnquiryDeliveryController)
	.controller('EnquiryReviewCtrl', EnquiryReviewController)
	.controller('NewEnquiryAddressModalCtrl', NewEnquiryAddressModalController)
    .controller('ConfirmEnquiryCtrl', ConfirmEnquiryController)
;

function EnquiryService() {
    var svc = {
        Step: 0,
        EnquiryData: null,
        SerialNumber: "",
        Manufacturer: null,
        ValveType: null,
        Parts: {},
        Comment: null,
        PartList: null,
        Shipping: {},
        Quote: null
    };
    return svc;
}

function EnquiryConfig($stateProvider) {
    $stateProvider
		.state('enquiry', {
		    parent: 'base',
		    url: '/enquiry',
		    templateUrl: 'enquiry/templates/enquiry.tpl.html',
		    controller: 'EnquiryCtrl',
		    controllerAs: 'enquiry',
		    resolve: {
		        CurrentCustomer: function (CurrentOrder) {
		            return CurrentOrder.GetCurrentCustomer();
		        }
		    }
		})
	    .state('enquiry.filter', {
	        url: '/filter',
	        templateUrl: 'enquiry/templates/enquiry.filter.tpl.html',
	        controller: 'EnquiryFilterCtrl',
	        controllerAs: 'enqfilter',
	        resolve: {
	            EnquiryData: function ($stateParams, WeirService) {
	                return WeirService.GetEnquiryCategories();
	            }
	        }
	    })
	    .state('enquiry.select', {
	        url: '/select',
	        templateUrl: 'enquiry/templates/enquiry.select.tpl.html',
	        controller: 'EnquirySelectCtrl',
	        controllerAs: 'select',
	        resolve: {
	            PartList: function (WeirService, EnquiryService) {
	                return WeirService.GetEnquiryParts(EnquiryService.EnquiryData.catalog, EnquiryService.ValveType);
	            }
	        }
	    })
	    .state('enquiry.delivery', {
	        url: '/delivery',
	        templateUrl: 'enquiry/templates/enquiry.delivery.tpl.html',
	        controller: 'EnquiryDeliveryCtrl',
	        controllerAs: 'delivery',
	        resolve: {
	            Addresses: function (OrderCloud) {
	                return OrderCloud.Addresses.List(null, null, null, null, null, null, OrderCloud.BuyerID.Get());
	            }
	        }
	    })
	    .state('enquiry.review', {
	        url: '/review',
	        templateUrl: 'enquiry/templates/enquiry.review.tpl.html',
	        controller: 'EnquiryReviewCtrl',
	        controllerAs: 'review'
	    });
}

function EnquiryController($state, $sce, WeirService, EnquiryService, OrderCloud, toastr, Me) {
    var vm = this;
    vm.info = EnquiryService;
    vm.locale = WeirService.Locale();
    vm.info = EnquiryService;
    vm.searchAgain = function () {
        var searchType = WeirService.GetLastSearchType();
        searchType = searchType || WeirService.SearchType.Serial;
        if (searchType == WeirService.SearchType.Part) {
            $state.go('search.part');
        } else if (searchType == WeirService.SearchType.Tag) {
            $state.go('search.tag');
        } else {
            $state.go('search.serial');
        }
    };
    var labels = {
        en: {
            CantFindHeader: "Can't find what you are looking for?",
            CantFindText1: "If you can't find what you are looking for please try searching again",
            CantFindText2: "Alternatively please submit an enquiry using the form below – simply enter the serial number of the valve you require spares for and select the brand and valve type to view a list of part types associated with the valve type.",
            SearchAgain: "Search again",
            YourContact: "Your contact",
            PartTypesHeader: "Part types for; ",
            SerNumLabel: "Serial number; ",
            BrandLabel: "Brand; ",
            ValveTypeLabel: "Valve type; ",
            DescriptionHeader: "Description of part",
            QuantityHeader: "Quantity",
            CommentsAction: "Comments",
            FilterStep: "Filter",
            SelectStep: "Select",
            DeliveryStep: "Delivery",
            ReviewStep: "Review & Submit"
        },
        fr: {
            CantFindHeader: $sce.trustAsHtml("Vous n'arrivez pas à trouver ce que vous cherchez?"),
            CantFindText1: $sce.trustAsHtml("Si vous ne trouvez pas ce que vous cherchez, veuillez essayer de nouveau."),
            CantFindText2: $sce.trustAsHtml("Vous pouvez également remplir le formulaire ci-dessous – Entrez simplement le numéro de série de la soupape voulue. Sélectionnez la marque et le type de soupape pour afficher une liste des types de pièces associés au type de soupape. "),
            SearchAgain: $sce.trustAsHtml("Chercher à nouveau"),
            YourContact: $sce.trustAsHtml("Votre contact"),
            PartTypesHeader: $sce.trustAsHtml("Pi&egrave;ces pour: "),
            SerNumLabel: $sce.trustAsHtml("Numéro de série"),
            BrandLabel: $sce.trustAsHtml("Marque: "),
            ValveTypeLabel: $sce.trustAsHtml("Type: "),
            DescriptionHeader: $sce.trustAsHtml("Désignation"),
            QuantityHeader: $sce.trustAsHtml("Quantité"),
            CommentsAction: $sce.trustAsHtml("Commentaires"),
            FilterStep: "Filtre",
            SelectStep: "Selection",
            DeliveryStep: "Livraison",
            ReviewStep: $sce.trustAsHtml("R&eacute;cap et soumission")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    if ($state.current.name == 'enquiry') {
        $state.go('enquiry.filter');
    }
}

function EnquiryFilterController($state, $sce, WeirService, OrderCloud, EnquiryService, EnquiryData, toastr, Me) {
    var vm = this;
    vm.info = EnquiryService;
    vm.info.EnquiryData = EnquiryData;
    vm.enquiryData = vm.info.EnquiryData;
    vm.locale = WeirService.Locale();
    var labels = {
        en: {
            SerNumPrompt: "Enter Serial number",
            BrandPrompt: "Select brand of valve.",
            ValveTypePrompt: "Select valve type.",
            SerNumPlaceholder: "Serial number",
            BrandPlaceholder: "Brand name",
            ValveTypePlaceholder: "Valve type",
            Submit: "Show spares list"
        },
        fr: {
            SerNumPrompt: $sce.trustAsHtml("Entrée le numéro de série"),
            BrandPrompt: $sce.trustAsHtml("S&eacute;lectionner une marque"),
            ValveTypePrompt: $sce.trustAsHtml("S&eacute;lectionner un type de soupape"),
            SerNumPlaceholder: "Champ libre",
            BrandPlaceholder: "Marque",
            ValveTypePlaceholder: "Type de soupape",
            Submit: $sce.trustAsHtml("Afficher la liste de pi&egrave;ce")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    vm.showSpares = function () {
        $state.go('enquiry.select');
    };
    vm.updateValveTypes = function (preserveParts) {
        vm.valveTypes = [];
        if (vm.info.Manufacturer) {
            vm.valveTypes = vm.enquiryData.valvetypes[vm.info.Manufacturer.ID];
        }
        if (!preserveParts) {
            vm.info.Parts = {};
            vm.info.Comment = null;
            vm.info.Step = 1;
        } else if (vm.info.Step < 1) {
            vm.info.Step = 1;
        }
    };
    vm.valveTypeChanged = function () {
        vm.info.Parts = {};
        vm.info.Comment = null;
    };
    vm.updateValveTypes(true);
}
function EnquirySelectController($state, $sce, WeirService, OrderCloud, PartList, EnquiryService, toastr, Me) {
    var vm = this;
    vm.enq = EnquiryService;
    vm.enq.Comment = vm.enq.Comment || {
        by: Me.Profile.FirstName + " " + Me.Profile.LastName,
        date: new Date(),
        val: "",
        IsWeirComment: false
    };

    if (vm.enq.Step < 2) vm.enq.Step = 2;
    vm.enq.PartList = PartList.Items; // TODO: Replace vm.parts usage with this form
    vm.parts = PartList.Items;
    for (var i = 0; i < vm.parts.length; i++) {
        vm.enq.Parts[vm.parts[i].ID] = vm.enq.Parts[vm.parts[i].ID] || 0;
        vm.parts[i].origQty = vm.enq.Parts[vm.parts[i].ID] || 0;
        vm.parts[i].quantity = vm.parts[i].origQty;
    }
    var labels = {
        en: {
            ChangeAction: "Change",
            AddedLabel: "Added",
            AddLabel: "Add"
        },
        fr: {
            ChangeAction: "Changer",
            AddedLabel: "Ajouter",
            AddLabel: $sce.trustAsHtml("Ajouté")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    vm.newFilter= function () {
        $state.go('enquiry.filter');
    };
    vm.toDelivery = function () {
        $state.go('enquiry.delivery');
    };
    vm.updateLineItem = function (part) {
        part.origQty = part.quantity;
        vm.enq.Parts[part.ID] = part.quantity;
    };
    vm.hasParts = function () {
        for (var p in vm.enq.Parts) {
            if (vm.enq.Parts[p]) return true;
        }
        return false;
    };
}
function EnquiryDeliveryController($state, $sce, $uibModal, WeirService, OrderCloud, EnquiryService, Underscore, toastr, Addresses, OCGeography, Me) {
    var vm = this;
    vm.enq = EnquiryService;
    if (vm.enq.Step < 3) vm.enq.Step = 3;
    vm.addresses = Addresses.Items;

    vm.ChunkedData = _chunkData(vm.addresses, 2);
    function _chunkData(arr, size) {
        var newArray = [];
        for (var i = 0; i < arr.length; i += size) {
            newArray.push(arr.slice(i, i + size));
        }
        return newArray;
    }
    var activeAddress = function (address) {
        return address.xp.active == true;
    };
    vm.addresses = Underscore.sortBy(Addresses.Items, function (address) {
        return address.xp.primary;
    }).filter(activeAddress).reverse();

    if (!vm.enq.Shipping.ID && vm.addresses.length > 0) {
        vm.enq.Shipping = vm.addresses[0];
    }

    vm.country = function (c) {
        var result = Underscore.findWhere(OCGeography.Countries, { value: c });
        return result ? result.label : '';
    };
    vm.setShippingAddress = function(addr) {
        vm.enq.Shipping = addr;
    };
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
                return OrderCloud.Addresses.Create(address, OrderCloud.BuyerID.Get());
            })
            .then(function (newAddress) {
                newAddressResults.ID = newAddress.ID;
                newAddressResults.Name = newAddress.AddressName;
                vm.setShippingAddress(newAddress);
                return WeirService.AssignAddressToGroups(newAddressResults.ID);
            })
            .then(function () {
                $state.go($state.current, {}, {reload: true});
                toastr.success(vm.labels.ShippingAddressSet + newAddressResults.Name, vm.labels.ShippingAddressTitle);
            })
            .catch(function (ex) {
                if (ex !== 'cancel') {
                    $exceptionHandler(ex);
                }
            });
    }

    var labels = {
        en: {
            DefaultAddress: "Your Default Address",
            DeliverToLabel: "Deliver to this Address",
            AddAddress: "Add a New Address",
            ShippingAddressSet: "Shipping address set to ",
            Success: "Success",
            ShippingAddressTitle: "Shipping Address Set",
            BackCommand: "Back",
            ReviewCommand: "Review and Submit"
        },
        fr: {
            DefaultAddress: $sce.trustAsHtml("Votre adresse par défaut"),
            DeliverToLabel: $sce.trustAsHtml("Livrer à cette adresse"),
            AddAddress: $sce.trustAsHtml("Ajouter une adresse"),
            ShippingAddressSet: $sce.trustAsHtml("Livraison confirmée à cette adresse "),
            Success: $sce.trustAsHtml("Succès"),
            ShippingAddressTitle: "Adresse de livraison",
            BackCommand: $sce.trustAsHtml("Retour"),
            ReviewCommand: $sce.trustAsHtml("Récap et soumission")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    vm.back = function () { $state.go('enquiry.select'); };
    vm.next = function () { $state.go('enquiry.review'); };
}

function NewEnquiryAddressModalController($uibModalInstance, $sce, WeirService) {
    var vm = this;
    vm.address = {};
    vm.address.xp = {};
    vm.address.xp.active = true;
    vm.address.xp.primary = false;

    var labels = {
        en: {
            Submit: "Submit",
            Cancel: "Cancel"
        },
        fr: {
            Submit: $sce.trustAsHtml("Soumettre"),
            Cancel: $sce.trustAsHtml("Annuler")
        }
    };

    vm.labels = WeirService.LocaleResources(labels);

    vm.submit = function () {
        $uibModalInstance.close(vm.address);
    };

    vm.cancel = function () {
        vm.address = {};
        $uibModalInstance.dismiss('cancel');
    };
}

function EnquiryReviewController($state, $sce, $uibModal, WeirService, OrderCloud, EnquiryService, Underscore, OCGeography, toastr, Me) {
    var vm = this;
    vm.enq = EnquiryService;
    if (vm.enq.Step < 4) vm.enq.Step = 4;
    var labels = {
        en: {
            DeliveryAddress: "Delivery Address",
            BackCommand: "Back",
            SubmitCommand: "Submit enquiry"
        },
        fr: {
            DeliveryAddress: "Adresse de livraison",
            BackCommand: $sce.trustAsHtml("Retour"),
            SubmitCommand: $sce.trustAsHtml("Soumettre demande")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    vm.country = function (c) {
        var result = Underscore.findWhere(OCGeography.Countries, { value: c });
        return result ? result.label : '';
    };
    vm.back = function () { $state.go('enquiry.delivery'); };
    vm.next = function () {
        WeirService.SubmitEnquiry(vm.enq)
			.then(function (info) {
			    vm.enq.Quote = info;
			    var modalInstance = $uibModal.open({
			        animation: true,
			        ariaLabelledBy: 'modal-title',
			        ariaDescribedBy: 'modal-body',
			        templateUrl: 'enquiry/templates/enquiry.confirmed.tpl.html',
			        size: 'lg',
			        controller: 'ConfirmEnquiryCtrl',
			        controllerAs: 'confirm',
			        resolve: {
			            Enquiry: function () {
			                return vm.enq;
			            }
			        }
			    }).closed.then(function () {
			        vm.enq.Step = 0;
			        vm.enq.EnquiryData = null;
			        vm.enq.SerialNumber = "";
			        vm.enq.Manufacturer = null;
			        vm.enq.ValveType = null;
			        vm.enq.Parts = {};
			        vm.enq.Comment = null;
			        vm.enq.PartList = null;
			        vm.enq.Shipping = {};
			        vm.enq.Quote = null;
			        $state.go('home');
			    });
			})
           .catch(function (ex) {
                deferred.reject(ex);
           });
    };

}

function ConfirmEnquiryController($state, $sce, $uibModalInstance, Enquiry) {
    var vm = this;
    vm.Enquiry = Enquiry;

    var labels = {
        en: {
            Title: "Thank you. Your enquiry has been submitted",
            MessageText1: "We have sent you a confirmation email.",
            MessageText2: "Enquiry number; " + vm.Enquiry.Quote.ID,
            MessageText3: "You will be able to view your enquiry in Your Quotes. We will respond to enquiry as soon as possible.",
            Close: "Close"
        },
        fr: {
            Title: $sce.trustAsHtml("Merci. Votre demande a été soumise."),
            MessageText1: $sce.trustAsHtml("TODO: We have sent you a confirmation email."),
            MessageText2: $sce.trustAsHtml("Reference d’offre: " + vm.Enquiry.Quote.ID),
            MessageText3: $sce.trustAsHtml("Vous pouvez consulter votre demande dans l’onglet “Vos Cotations”. Nous vous réponderons dans les plus brefs délais."),
            Close: $sce.trustAsHtml("Fermer")
        }
    };

    vm.Close = function () {
        $uibModalInstance.dismiss();
    };
    vm.labels = WeirService.LocaleResources(labels);
}