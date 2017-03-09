angular.module('orderCloud')
	.config(EnquiryConfig)
	.controller('EnquiryCtrl', EnquiryController)
	.controller('EnquiryFilterCtrl', EnquiryFilterController)
	.controller('EnquirySelectCtrl', EnquirySelectController)
	.controller('EnquiryDeliveryCtrl', EnquiryDeliveryController)
	.controller('EnquiryReviewCtrl', EnquiryReviewController)
;

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
	            Brands: function ($stateParams, WeirService) {
	                return WeirService.GetEnquiryBrands();
	            }
	        }
	    })
	    .state('enquiry.select', {
	        url: '/select',
	        templateUrl: 'enquiry/templates/enquiry.select.tpl.html',
	        controller: 'EnquirySelectCtrl',
	        controllerAs: 'select'
	    })
	    .state('enquiry.delivery', {
	        url: '/delivery',
	        templateUrl: 'enquiry/templates/enquiry.delivery.tpl.html',
	        controller: 'EnquiryDeliveryCtrl',
	        controllerAs: 'delivery'
	    })
	    .state('enquiry.review', {
	        url: '/review',
	        templateUrl: 'enquiry/templates/enquiry.review.tpl.html',
	        controller: 'EnquiryReviewCtrl',
	        controllerAs: 'review'
	    });
}

function EnquiryController($state, $sce, WeirService, OrderCloud, toastr, Me) {
    var vm = this;
    vm.locale = WeirService.Locale();
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

function EnquiryFilterController($state, $sce, WeirService, OrderCloud, Brands, toastr, Me) {
    var vm = this;
    vm.brand = "";
    vm.brands = Brands;
    vm.searchTerm = "";
    vm.locale = WeirService.Locale();
    var labels = {
        en: {
            SerNumPrompt: "Enter Serial number",
            BrandPrompt: "Select brand of valve.",
            ValveTypePrompt: "Select valve type.",
            SerNumPlaceholder: "",
            BrandPlaceholder: "Brand name",
            ValveTypePlaceholder: "Valve type",
            Submit: "Show spares list"
        },
        fr: {
            SerNumPrompt: $sce.trustAsHtml("Entrée le numéro de série"),
            BrandPrompt: $sce.trustAsHtml("TODO: Select brand of valve."),
            ValveTypePrompt: $sce.trustAsHtml("TODO: Select valve type."),
            SerNumPlaceholder: "Champ libre",
            BrandPlaceholder: "Marque",
            ValveTypePlaceholder: "Type de soupape",
            Submit: $sce.trustAsHtml("Suivant")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    vm.showSpares = function () {
        console.log("Go to spares list");
    }
    vm.valveTypes = [];
    vm.updateValveTypes = function () {
        vm.valveTypes = [];
        if (vm.brand) {
            WeirService.GetEnquiryValveTypes(vm.brand.ID)
            .then(function (vtList) {
                vm.valveTypes.push.apply(vm.valveTypes, vtList);
            }).catch(function (ex) {
                console.log("Error getting valve types: " + JSON.stringify(ex));
            });
        }
    }
}
function EnquirySelectController($state, $sce, WeirService, OrderCloud, toastr, Me) {
}
function EnquiryDeliveryController($state, $sce, WeirService, OrderCloud, toastr, Me) {
}
function EnquiryReviewController($state, $sce, WeirService, OrderCloud, toastr, Me) {

}