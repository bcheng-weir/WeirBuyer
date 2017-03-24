angular.module('orderCloud')
	.config(SearchConfig)
	.controller('SearchCtrl', SearchController)
	.controller('SerialCtrl', SerialController)
	.controller('SerialResultsCtrl', SerialResultsController)
	.controller('SerialDetailCtrl', SerialDetailController)
	.controller('PartCtrl', PartController)
	.controller('PartResultsCtrl', PartResultsController)
	.controller('TagCtrl', TagController)
	.controller('TagResultsCtrl', TagResultsController)
	.controller('TagDetailCtrl', TagDetailController)
	.controller('NoResultCtrl', NoResultsController)
;

function SearchConfig($stateProvider) {
	$stateProvider
		.state('search', {
			parent: 'base',
			url: '/search',
			templateUrl: 'search/templates/search.tpl.html',
			controller: 'SearchCtrl',
			controllerAs: 'search',
			resolve: {
				CurrentCustomer: function(CurrentOrder) {
					return CurrentOrder.GetCurrentCustomer();
				}
			}
		})
		.state( 'search.serial', {
			url: '/serial',
			templateUrl: 'search/templates/search.serial.tpl.html',
			controller: 'SerialCtrl',
			controllerAs: 'serial'
		})
		.state( 'search.serial.results', {
			url: '/search?numbers',
			templateUrl: 'search/templates/search.serial.results.tpl.html',
			controller: 'SerialResultsCtrl',
			controllerAs: 'serialResults',
			resolve: {
				SerialNumberResults: function( $stateParams, WeirService ) {
					return WeirService.SerialNumbers($stateParams.numbers.split(','));
				}
			}
		})
		.state( 'search.serial.detail', {
			url: '/:number?:searchNumbers',
			templateUrl: 'search/templates/search.serial.detail.tpl.html',
			controller: 'SerialDetailCtrl',
			controllerAs: 'serialDetail',
			resolve: {
				SerialNumberDetail: function( $stateParams, WeirService ) {
					return WeirService.SerialNumber($stateParams.number);
				}
			}
		})
		.state( 'search.part', {
			url: '/part',
			templateUrl: 'search/templates/search.part.tpl.html',
			controller: 'PartCtrl',
			controllerAs: 'part'
		})
		.state( 'search.part.results', {
			url: '/search?numbers',
			templateUrl: 'search/templates/search.part.results.tpl.html',
			controller: 'PartResultsCtrl',
			controllerAs: 'partResults',
			resolve: {
				PartNumberResults: function( $stateParams, WeirService, Me) {
					return WeirService.PartNumbers(Me.Org.xp.WeirGroup.label, $stateParams.numbers.split(','));
				}
			}
		})
		.state( 'search.tag', {
			url: '/tag',
			templateUrl: 'search/templates/search.tag.tpl.html',
			controller: 'TagCtrl',
			controllerAs: 'tag'
		})
		.state( 'search.tag.results', {
			url: '/search?numbers',
			templateUrl: 'search/templates/search.tag.results.tpl.html',
			controller: 'TagResultsCtrl',
			controllerAs: 'tagResults',
			resolve: {
				TagNumberResults: function( $stateParams, WeirService ) {
					return WeirService.TagNumbers($stateParams.numbers.split(','));
				}
			}
		})
		.state( 'search.tag.detail', {
			url: '/:id?:number?:searchNumbers',
			templateUrl: 'search/templates/search.tag.detail.tpl.html',
			controller: 'TagDetailCtrl',
			controllerAs: 'tagDetail',
			resolve: {
			    TagNumberDetail: function ($stateParams, WeirService) {
					return WeirService.GetValve($stateParams.id);
				}
			}
		})
		.state( 'search.noresults', {
			url: '/noresults',
			templateUrl: 'search/templates/search.noresults.tpl.html',
			controller: 'NoResultCtrl',
			controllerAs: 'noResult'
		});
}

function SearchController($sce, $state, $rootScope, CurrentOrder, WeirService, CurrentCustomer, Me, imageRoot, SearchTypeService) {
	var vm = this;
	vm.searchType = WeirService.GetLastSearchType();
	vm.IsServiceOrg = (Me.Org.xp.Type.id == 2);
	vm.WeirGroup = Me.Org.xp.WeirGroup.label;
    vm.Customer = CurrentCustomer;
    if(!Me.Org.xp.Customers){
	    Me.Org.xp.Customers = [];
	}
    vm.AvailableCustomers = Me.Org.xp.Customers;

    vm.ImageBaseUrl = imageRoot;
    vm.GetValveImageUrl = function (img) {
        return vm.ImageBaseUrl + "Valves/" + img;
    };

	if (!vm.IsServiceOrg) {
	    if (!vm.Customer || vm.Customer.id != Me.Org.ID) {
	        vm.Customer = {id: Me.Org.ID, name: Me.Org.Name};
	        CurrentOrder.SetCurrentCustomer(vm.Customer)
                .then(function() {
					CurrentOrder.Get();
                })
				.catch(function() {
	                WeirService.FindCart(vm.Customer);
	            });
	    }
	}

	vm.searchall = SearchTypeService.IsGlobalSearch();
	if (vm.WeirGroup == 'WPIFR') {
	    vm.selfsearch = !vm.searchall;
	} else {
	    vm.selfsearch = (vm.Customer.id == Me.Org.ID);
	}
    // This function is used by WPIFR users - they select only own products or global search
    // and their order / cart is always in the context of themselves, not any other specific customer
	vm.SetGlobalSearch = function (isGlobal) {
	    vm.selfsearch = !isGlobal;
	    vm.searchall = isGlobal;
	    SearchTypeService.SetGlobalSearchFlag(vm.searchall);
	    vm.SelectingCustomer = false;
	};

	vm.SelectingCustomer = vm.IsServiceOrg && !vm.Customer;
	vm.customerFilter = null;
	vm.SelectCustomer = function() {
		if (vm.Customer.id == Me.Org.ID) {
		    vm.customerFilter = "";
		    vm.selfsearch = true;
		} else {
		    vm.customerFilter = vm.Customer.name;
		    vm.selfsearch = false;
		}
		vm.SelectingCustomer = true;
	};
	vm.ClearFilter = function () { vm.customerFilter = null; $rootScope.$broadcast('OC:RemoveOrder', null, null); };
	vm.CustomerSelected = function() {
	    if (vm.searchall) { // do NOT change the current customer. Scope of global search lasts only until they leave the current search screen
	        SearchTypeService.SetGlobalSearchFlag(vm.searchall);
		    vm.SelectingCustomer = vm.IsServiceOrg && !vm.Customer;
		    return;
	    }
	    var wasGlobal = SearchTypeService.IsGlobalSearch();
	    SearchTypeService.SetGlobalSearchFlag(false);
	    var newCust = null;
	    if (vm.selfsearch) {
	        newCust = {id: Me.Org.ID, name: Me.Org.Name};
	    } else {
			for(var i=0; i<vm.AvailableCustomers.length; i++) {
		        if (vm.AvailableCustomers[i].name == vm.customerFilter) {
	                newCust = vm.AvailableCustomers[i];
					break;
		        }
			}
	    }
		if (newCust && (!wasGlobal || !vm.Customer || newCust.id != vm.Customer.id)) { // This last portion could prevent a new cart from being started by the same customer. Need to test.
		    vm.Customer = newCust;
		    CurrentOrder.Remove()
			    .then(function() {
				    return CurrentOrder.SetCurrentCustomer(vm.Customer);
			    })
			    .then(function() {
				    //vm.serialNumberList.length = 0;
				    return WeirService.FindCart(vm.Customer);
				    /*WeirService.FindCart(vm.Customer) //This will look for the current DR record. If it can't be found, a DR record is created.
					    .then(function() {
						    OrderCloud.Me.ListCategories(null, 1, 100, null, null, { "catalogID": Me.Org.xp.WeirGroup.label})
							    .then(function(results) {
								    //vm.serialNumberList.push.apply(vm.serialNumberList, results.Items);
							    });
					    });*/
			    });
	    }
	    vm.SelectingCustomer = vm.IsServiceOrg && !vm.Customer;
		$rootScope.$broadcast('OC:RemoveOrder');
	};
					
	vm.formatSerialNumber = function(number) {
		if (!number) return;
		return number.substr(0,3) + '-' + number.substr(3,3) + '/' + number.substr(6,4);
	};
	var labels = {
		en: {
			SerialSearch: "Search by serial number",
			PartSearch: "Search by part number",
			TagSearch: "Search by Tag number",
			CustomerFilter: "Results filtered by; ",
            NoFilter: "Any customer",
			SelectCustomer: "Reset search filter",
			SearchMine: "Search my valves",
            SearchAll: "Search all valves",
			SearchOr: "Or",
			FilterEndUser: "Filter by end-user",
			AllValves: "All Valves",
			MyValves: "My Valves",
			Select: "Select",
			ReplacementGuidance: "Recommended replacement guidance; If ordering 5 year spares you should also order all 2 year spares. If ordering 10 year spares, you should also order all 5 year and 2 year spares.",
			POAGuidance: "POA; You can add POA items to your quote and submit your quote for review. We will endeavour to respond with a price for POA items within two days of receipt of your quote request.",
			PriceDisclaimer: "All prices stated do not include UK VAT or delivery",
			NotAvailable: "N/A",
            ApplyFilter: "OK"
		},
		fr: {
		    SerialSearch: $sce.trustAsHtml("Rechercher par Num&eacute;ro de S&eacute;rie"),
		    PartSearch: $sce.trustAsHtml("Rechercher par R&eacute;f&eacute;rence de Pi&egrave;ce"),
		    TagSearch: $sce.trustAsHtml("Rechercher par numéro de repère soupape"),
		    CustomerFilter: $sce.trustAsHtml("R&eacute;sultats filtr&eacute;s par: "),
		    NoFilter: $sce.trustAsHtml("Tout client"),
		    SelectCustomer: $sce.trustAsHtml("Renouveler la recherche filtr&eacute;e"),
		    SearchMine: $sce.trustAsHtml("Rechercher votre produit"),
		    SearchAll: $sce.trustAsHtml("Rechercher toutes les soupapes"),
		    SearchOr: $sce.trustAsHtml("Ou"),
		    FilterEndUser: $sce.trustAsHtml("Filtrer par clients finaux"),
		    AllValves:  $sce.trustAsHtml("Toutes les soupapes"),
		    MyValves: $sce.trustAsHtml("Mes soupapes achetées"),
		    Select: $sce.trustAsHtml("S&eacute;lectionner"),
		    ReplacementGuidance: $sce.trustAsHtml("Remplacement recommandé: Si vous commandez les pièces recommandées à 5 ans, vous devriez également commander toutes les pièces recommandées à 2 ans. Si vous commandez des pièces recommandées à 10 ans , vous devez également commander toutes les pièces recommandées à 5 et 2 ans."),
		    POAGuidance: $sce.trustAsHtml("Prix à confirmer: Vous pouvez ajouter des articles dont les prix ne sont pas renseignés à votre cotation et soumettre à révision. Nous les renseignerons sur la révision."),
		    PriceDisclaimer: $sce.trustAsHtml("Tous les prix indiqués ne comprennent pas la TVA ni la livraison en France"),
		    NotAvailable: $sce.trustAsHtml("Non Applicable"),
		    ApplyFilter: $sce.trustAsHtml("OK")
	    }
	};
	vm.labels = WeirService.LocaleResources(labels);
        var searchType = WeirService.GetLastSearchType();
	searchType = searchType || WeirService.SearchType.Serial;
	if ($state.current.name == 'search.noresults') {
        // No further transition
	}
	else if (searchType == WeirService.SearchType.Part) {
	    $state.go('search.part');
	} else if (searchType == WeirService.SearchType.Tag) {
	    $state.go('search.tag');
	} else if (searchType == WeirService.SearchType.Serial) {
	    $state.go('search.serial');
	}

	vm.setSelected = function(selectedID) {

	};
}

function SerialController(WeirService, $scope, $state, $sce, toastr, SearchProducts) {
    var vm = this;
    vm.SerialNumberMatches = [];

    var labels = {
        en: {
            WhereToFind: "where to find your serial number",
            EnterSerial: "Enter Serial Number",
            AddMore: "Add More Serial Numbers   +",
            ClearSearch: "Clear Search",
            toastEnterSearchBox: "Please enter an item in the search box.",
            Search: "Search",
			EmptySearch: "Empty Search"
        },
        fr: {
            WhereToFind: $sce.trustAsHtml("O&ugrave; trouver votre num&eacute;ro de s&eacute;rie"),
            EnterSerial: $sce.trustAsHtml("Entrer le Num&eacute;ro de S&eacute;rie"),
            AddMore: $sce.trustAsHtml("Ajouter plus de Num&eacute;ro de S&eacute;rie   +"),
            ClearSearch: $sce.trustAsHtml("Nouvelle recherche"),
            toastEnterSearchBox: $sce.trustAsHtml("Veuillez saisir un élément dans la barre de recherche."),
            Search: $sce.trustAsHtml("Rechercher"),
			EmptySearch: $sce.trustAsHtml("Recherche vide")
        }
    };
    vm.labels = WeirService.LocaleResources(labels);
    WeirService.SetLastSearchType(WeirService.SearchType.Serial);

    vm.serialNumbers = [null];

    vm.addSerialNumber = function () {
        vm.serialNumbers.push(null);
    };

    vm.removeSerialNumber = function (index) {
        vm.serialNumbers.splice(index, 1);
    };

    vm.searchSerialNumbers = function () {
        if (!vm.serialNumbers[0] || vm.serialNumbers.length == 0) {
            toastr.info(vm.labels.toastEnterSearchBox, vm.labels.EmptySearch);
        //} else if (vm.serialNumbers.length == 1) {
        //    $state.go('search.serial.detail', { number: vm.serialNumbers[0], searchNumbers: vm.serialNumbers[0] });
        } else {
            $state.go('search.serial.results', { numbers: vm.serialNumbers.join(',') });
        }
    };

    vm.clearSearch = function () {
        vm.serialNumbers = [null];
    };

    vm.showClearSearch = function () {
        var count = 0;
        angular.forEach(vm.serialNumbers, function (number) {
            if (number) count++;
        });
        return count > 0;
    };
    vm.goToArticle = function (article) {
        $state.go('news', { id: article.ID });
    };

    vm.updateSerialList = function (input) {
    	return SearchProducts.GetPart(input, $scope.search.Customer);
    };
}

function SerialResultsController(WeirService, $stateParams, $state, SerialNumberResults, $sce, Me ) {
	var vm = this;
	vm.serialNumberResults = SerialNumberResults;
	vm.searchNumbers = $stateParams.numbers;

	var multiCust = false;
	var cust = "";
	var numFound = 0;
	for(var i=0; i< SerialNumberResults.length; i++) {
		var tmp = SerialNumberResults[i].Detail;
		if (tmp) {
		    numFound++;
		    if (cust == "" || (tmp.xp.Customer && tmp.xp.Customer != cust)) {
		        if (cust != "") {
			        multiCust = true;
		        } else {
			        cust = tmp.xp.Customer;
		        }
		    }
		}
	}
	vm.MultipleCustomers = multiCust;
	vm.Customer = cust;

	var labels = {
		en: {
			Customer: "Customer; ",
			ResultsHeader: "Showing results for serial numbers; " + numFound.toString() + " of " + SerialNumberResults.length.toString() + " searched serial numbers found",
			SerialNumber: "Serial Number",
			TagNumber: "Tag number (if available)",
			ValveDesc: "Valve description",
			NoResultsMsg: "No results found for;",
			SearchAgain: "Search again",
			ViewDetails: "View details"
		},
		fr: {
			Customer: "Client: ",
			ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les num&eacute;ros de s&eacute;rie: de " + numFound.toString() + " &agrave; " + SerialNumberResults.length.toString() + " num&eacute;ros de s&eacute;rie trouv&eacute;s."),
			SerialNumber: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNumber: $sce.trustAsHtml("Num&eacute;ro de Tag (si disponible)"),
			ValveDesc: $sce.trustAsHtml("Description de soupape"),
			NoResultsMsg: $sce.trustAsHtml("Pas de r&eacute;sultats pour:"),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			ViewDetails: $sce.trustAsHtml("Voir les d&eacute;tails")
		}
	};
	if (numFound == 0) {
	    if (Me.Org.xp.WeirGroup.label == 'WPIFR') {
	        $state.go('enquiry.filter');
	    } else {
	        $state.go('search.noresults');
	    }
	} else if (numFound == 1) {
	    $state.go('search.serial.detail', { id: SerialNumberResults[0].Detail.ID });
	}
	vm.labels = WeirService.LocaleResources(labels);
}

function SerialDetailController( $stateParams, $rootScope, $state, $sce, Me, WeirService, SerialNumberDetail ) {
	var vm = this;
	vm.serialNumber = SerialNumberDetail;
	vm.searchNumbers = $stateParams.searchNumbers;
	vm.PartQuantity = function(partId) {
		return SerialNumberDetail.xp.Parts[partId];
	};
	if (typeof vm.serialNumber != 'object') {
	    if (Me.Org.xp.WeirGroup.label == 'WPIFR') {
	        $state.go('enquiry.filter');
	    } else {
	        $state.go('search.noresults', {}, { reload: true });
	    }
	}
	var labels = {
		en: {
			ResultsHeader: "Showing results for serial number; ",
			Tag: "Tag number (if available); ",
			Customer: "Customer; ",
			DeliveryDate: "Date delivered; ",
			SearchAgain: "Search Again",
			BackToResults: "Return to Results",
			SpecHeader: "Specification",
			SerialNum: "Serial number",
			ValveDesc: "Valve description",
			ValveQty: "Valve quantity",
			Size: "Size",
			ValveType: "Valve type",
			ValveForm: "Valve form",
			BodyRating: "Body rating",
			Pressure: "Pressure",
			BackPressure: "Back Pressure",
			Temp: "Temperature",
			Inlet: "In",
			Outlet: "Out",
			POA: "POA"
		},
		fr: {
		    ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les Num&eacute;ros de s&eacute;rie: "),
		    Tag: $sce.trustAsHtml("Num&eacute;ro de Tag (si disponible): "),
			Customer: $sce.trustAsHtml("Client: "),
			DeliveryDate: $sce.trustAsHtml("Date de livraison: "),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			BackToResults: $sce.trustAsHtml("Retourner aux r&eacute;sultats"),
			SpecHeader: $sce.trustAsHtml("Sp&eacute;cification"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de s&eacute;rie"),
			ValveDesc: $sce.trustAsHtml("Description de la soupape"),
			ValveQty: $sce.trustAsHtml("Quantit&eacute; de soupape"),
			Size: $sce.trustAsHtml("Dimension"),
			ValveType: $sce.trustAsHtml("Type de soupape"),
			ValveForm: $sce.trustAsHtml("Forme de soupape"),
			BodyRating: $sce.trustAsHtml("Classe de pression"),
			Pressure: $sce.trustAsHtml("Pression"),
			BackPressure: $sce.trustAsHtml("Contre-pression"),
			Temp: $sce.trustAsHtml("Temp&eacute;rature"),
			Inlet: $sce.trustAsHtml("Entr&eacute;e"),
			Outlet: $sce.trustAsHtml("Sortie"),
            POA: $sce.trustAsHtml("POA")
		}

	};
	var headers = {
		en: {
			PartList: "Parts list for serial number; ",
			PartNum: "Part number",
			PartDesc: "Description of part",
			PartQty: "Part quantity",
			ReplSched: "Recommended replacement (yrs)",
			LeadTime: "Lead time (days)",
			Price: "Price per item or set",
			Qty: "Quantity",
			LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
			AddToQuote: "Add to Quote"
		},
		fr: {
		    PartList: $sce.trustAsHtml("Liste des pi&eacute;ces pour ce num&eacute;ro de s&eacute;rie "),
		    PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
		    PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
		    PartQty: $sce.trustAsHtml("Quantit&eacute; de pi&egrave;ce"),
		    ReplSched: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
		    LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
		    Price: $sce.trustAsHtml("Prix par item ou par kit"),
			Qty: $sce.trustAsHtml("Quantit&eacute;"),
			LeadTimeNotice: $sce.trustAsHtml("Le d&eacute;lai de livraison pour toutes les commandes sera bas&eacute; sur le d&eacute;lai le plus long de la liste des pi&egrave;ces de rechanges demand&eacute;es"),
			AddToQuote: $sce.trustAsHtml("Ajouter &agrave; la cotation")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.headers = WeirService.LocaleResources(headers);

	vm.addButtons = [];
	vm.addPartToQuote = function (part, index) {
	    if (!part.Quantity) return;
	    vm.addButtons[index] = true;
		part.xp = typeof part.xp == "undefined" ? {} : part.xp;
		part.xp.SN = vm.serialNumber.Name;
		part.xp.TagNumber = vm.serialNumber.xp.TagNumber;
		WeirService.AddPartToQuote(part)
			.then(function(data) {
				$rootScope.$broadcast('LineItemAddedToCart', data.Order.ID, data.LineItem); //This kicks off an event in cart.js
				part.Quantity = null;
			});
	};

}

function PartController( $state, $sce , WeirService, Me, SearchProducts ) {
    var vm = this;
    vm.PartMatches = [];
	vm.WeirGroup = Me.Org.xp.WeirGroup.label;
	vm.partNumbers = [null];
	WeirService.SetLastSearchType(WeirService.SearchType.Part);

	vm.addPartNumber = function() {
		vm.partNumbers.push(null);
	};

	vm.removePartNumber = function(index) {
		vm.partNumbers.splice(index, 1);
	};

	vm.searchPartNumbers = function() {
		$state.go('search.part.results', {numbers: vm.partNumbers.join(',')});
	};

	vm.clearSearch = function() {
		vm.partNumbers = [null];
	};

	vm.showClearSearch = function() {
		var count = 0;
		angular.forEach(vm.partNumbers, function(number) {
			if (number) count++;
		});
		return count > 0;
	};

	var labels = {
		en: {
			WhereToFind: "where to find your part number",
			EnterPart: "Enter part number",
			EnterParts: "Enter part numbers",
			AddMore: "Add more part numbers   ",
			ClearSearch: "Clear search",
			Search: "Search",
			POA: "POA"
		},
		fr: {
		    WhereToFind: $sce.trustAsHtml("O&ugrave; trouver vos r&eacute;f&eacute;rences de pi&egrave;ces"),
		    EnterPart: $sce.trustAsHtml("Entrer une r&eacute;f&eacute;rence de pi&egrave;ce"),
		    EnterParts: $sce.trustAsHtml("Entrer plusieurs r&eacute;f&eacute;rences de pi&egrave;ce"),
		    AddMore: $sce.trustAsHtml("Ajouter plus de r&eacute;f&eacute;rences de pi&egrave;ce   "),
		    ClearSearch: $sce.trustAsHtml("Nouvelle recherche"),
		    Search: $sce.trustAsHtml("Rechercher"),
            POA: $sce.trustAsHtml("POA")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.updatePartList = function (input) {
		return SearchProducts.GetPart(input, null);
	};
}

function PartResultsController( $rootScope, $sce, $state, WeirService, PartNumberResults, Me ) {
	var vm = this;
	vm.partNumberResults = PartNumberResults;
	if (!vm.partNumberResults || !vm.partNumberResults.Parts || vm.partNumberResults.Parts.length == 0) {
	    if (Me.Org.xp.WeirGroup.label == 'WPIFR') {
	        $state.go('enquiry.filter');
	    } else {
	        $state.go('search.noresults');
	    }
    }
	var numFound = 0;
	angular.forEach(PartNumberResults.Parts, function(entry) {
	    if (entry.Detail) {
	        numFound++;
	        //console.log(entry.Detail.StandardPriceSchedule.PriceBreaks[0].Price);
	    }
	});

	var labels = {
		en: {
			Customer: "Customer",
			ResultsHeader: "Showing results for part numbers; " + numFound.toString() + " of " + PartNumberResults.NumSearched.toString() + " searched part numbers found",
			SearchAgain: "Search again",
			PartNum: "Part number",
			PartDesc: "Description of part",
			ReplSched: "Recommended replacement (yrs)",
			LeadTime: "Lead time (days)",
			Price: "Price per item or set",
			Qty: "Quantity",
			LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
			AddToQuote: "Add to Quote",
			POA: "POA"
		},
		fr: {
			Customer: $sce.trustAsHtml("Client"),
			ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les r&eacute;f&eacute;rences de pi&egrave;ces: de " + numFound.toString() + " &agrave; " + PartNumberResults.NumSearched.toString() + " r&eacute;f&eacute;rences de pi&egrave;ces trouv&eacute;es."),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&eacute;ce"),
			PartQty: $sce.trustAsHtml("Quantit&eacute; de partie"),
			ReplSched: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
			Price: $sce.trustAsHtml("Prix par item ou par kit"),
			Qty: $sce.trustAsHtml("Quantit&eacute;"),
			LeadTimeNotice: $sce.trustAsHtml("Le d&eacute;lai de livraison pour toutes les commandes sera bas&eacute; sur le d&eacute;lai le plus long de la liste des pi&egrave;ces de rechanges demand&eacute;es"),
			AddToQuote: $sce.trustAsHtml("Ajouter &agrave; la cotation"),
			POA: $sce.trustAsHtml("POA")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	if (numFound == 0) {
	    if (Me.Org.xp.WeirGroup.label == 'WPIFR') {
	        $state.go('enquiry.filter');
	    } else {
	        $state.go('search.noresults');
	    }
    }

	vm.addButtons = [];
	vm.addPartToQuote = function(part, index) {
	    if (!part.Quantity) return;
	    vm.addButtons[index] = true;
		part.xp = typeof part.xp == "undefined" ? {} : part.xp;
		part.xp.SN = null;
		part.xp.TagNumber = null;
		WeirService.AddPartToQuote(part)
			.then(function(data) {
				$rootScope.$broadcast('LineItemAddedToCart', data.Order.ID, data.LineItem); //This kicks off an event in cart.js
				part.Quantity = null;
			});
	};
}

function TagController(WeirService, $state, $sce, $scope, toastr, SearchProducts) {
    var vm = this;
    vm.TagMatches = [];

	var labels = {
		en: {
			// WhereToFind: "where to find your serial number",
			EnterTag: "Enter Tag number",
			AddMore: "Add more tag numbers   +",
			ClearSearch: "Clear Search",
			Search: "Search",
            toastEnterSearchBox: "Please enter an item in the search box.",
			TagDisclaimer: "*Tag number data may be incomplete. For best results search by serial number or part number",
			EmptySearch: "Empty Search"
		},
		fr: {
			// WhereToFind: $sce.trustAsHtml("O&ugrave; trouver votre num&eacute;ro de s&eacute;rie"),
		    EnterTag: $sce.trustAsHtml("Entr&eacute;e un num&eacute;ro de tag"),
		    AddMore: $sce.trustAsHtml("Ajouter plus de num&eacute;ro de tag   +"),
		    ClearSearch: $sce.trustAsHtml("Nouvelle recherche"),
		    Search: $sce.trustAsHtml("Rechercher"),
			toastEnterSearchBox: $sce.trustAsHtml("Veuillez saisir un élément dans la barre de recherche."),
		    TagDisclaimer: $sce.trustAsHtml("*La recherche par numéro de repère soupape peut afficher des résultats incomplet ou biasé. Pour obtenir les meilleurs résultats, recherchez par numéro de série ou numéro de pièce."),
            EmptySearch: $sce.trustAsHtml("Recherche vide")
	}
	};
	vm.labels = WeirService.LocaleResources(labels);
	WeirService.SetLastSearchType(WeirService.SearchType.Tag);
	vm.updateTagList = function(input) {
		return SearchProducts.GetPart(input, $scope.search.Customer);
    };
	vm.tags = [null];

	vm.addTag = function() {
		vm.tags.push(null);
	};

	vm.removeTag = function(index) {
		vm.tags.splice(index, 1);
	};

	vm.searchTags = function() {
		if(!vm.tags[0] || vm.tags.length == 0) {
			toastr.info(vm.labels.toastEnterSearchBox, vm.labels.EmptySearch);
		}
		else {
			$state.go('search.tag.results', {numbers: vm.tags.join(',')});
		}
	};

	vm.clearSearch = function() {
		vm.tags = [null];
	};

	vm.showClearSearch = function() {
		var count = 0;
		angular.forEach(vm.tags, function(number) {
			if (number) count++;
		});
		return count > 0;
	};
}

function TagResultsController(WeirService, $stateParams, $state, TagNumberResults, $sce, Me) {
    var vm = this;
    vm.tagNumberResults = TagNumberResults;
    vm.searchNumbers = $stateParams.numbers;
    var multiCust = false;
    var cust = "";
    var numFound = 0;
    var numQueried = 0;
    var tag = "";
    for (var i = 0; i < TagNumberResults.length; i++) {
        var tmp = TagNumberResults[i].Detail;
        if (tmp) {
            if (tag != TagNumberResults[i].Number) {
                tag = TagNumberResults[i].Number;
                numFound++;
                numQueried++;
            }
            if (cust == "" || (tmp.xp.Customer && tmp.xp.Customer != cust)) {
                if (cust != "") {
                    multiCust = true;
                } else {
                    cust = tmp.xp.Customer;
                }
            }
        } else if (tag != TagNumberResults[i].Number) {
            tag = TagNumberResults[i].Number;
            numQueried++;
        }
    }
    vm.MultipleCustomers = multiCust;
    vm.Customer = cust;

    var labels = {
        en: {
            Customer: "Customer; ",
            ResultsHeader: "Showing results for tag numbers; " + numFound.toString() + " of " + numQueried.toString() + " searched tag numbers found",
            SerialNumber: "Serial Number",
            TagNumber: "Tag number (if available)",
            ValveDesc: "Valve description",
            NoResultsMsg: "No results found for;",
            SearchAgain: "Search again",
            ViewDetails: "View details"
        },
        fr: {
            Customer: "Client: ",
            ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les Num&eacute;ro de tag : de " + numFound.toString() + " &agrave; " + numQueried.toString() + " Num&eacute;ros de tag trouv&eacute;s. "),
            SerialNumber: $sce.trustAsHtml("Num&eacute;ro de s&eacute;rie"),
            TagNumber: $sce.trustAsHtml("Num&eacute;ro de tag (si disponible)"),
            ValveDesc: $sce.trustAsHtml("Description de la soupape"),
            NoResultsMsg: $sce.trustAsHtml("Pas de r&eacute;sultats trouv&eacute;s pour:"),
            SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
            ViewDetails: $sce.trustAsHtml("Voir les d&eacute;tails")
        }
    };

    if (numFound == 0) {
        if (Me.Org.xp.WeirGroup.label == 'WPIFR') {
            $state.go('enquiry.filter');
        } else {
            $state.go('search.noresults');
        }
    } else if (numFound == 1 && numQueried == 1) {
        $state.go('search.tag.detail', { id: TagNumberResults[0].Detail.ID });
    }

    vm.labels = WeirService.LocaleResources(labels);
}

function TagDetailController( $stateParams, $rootScope, $sce, $state, WeirService, TagNumberDetail, Me ) {
	var vm = this;
	vm.tagNumber = TagNumberDetail;
	vm.searchNumbers = $stateParams.searchNumbers;
	if(typeof vm.tagNumber != 'object') {
		if (Me.Org.xp.WeirGroup.label == 'WPIFR') {
		    $state.go('enquiry.filter');
		} else {
		    $state.go('search.noresults', {}, { reload: true });
		}
    }
	vm.PartQuantity = function(partId) {
		return TagNumberDetail.xp.Parts[partId];
	};
	var labels = {
		en: {
			ResultsHeader: "Showing results for tag number; ",
			Tag: "Tag number (if available); ",
			Customer: "Customer; ",
			DeliveryDate: "Date delivered; ",
			SearchAgain: "Search Again",
			BackToResults: "Return to Results",
			SpecHeader: "Specification",
			SerialNum: "Serial number",
			ValveDesc: "Valve description",
			ValveQty: "Valve quantity",
			Size: "Size",
			ValveType: "Valve type",
			ValveForm: "Valve form",
			BodyRating: "Body rating",
			Pressure: "Pressure",
			BackPressure: "Back Pressure",
			Temp: "Temperature",
			Inlet: "In",
			Outlet: "Out",
            POA: "POA"
		},
		fr: {
		    ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les num&eacute;ros de tag: "),
			Tag: $sce.trustAsHtml("Num&eacute;ro de Tag (si disponible): "),
			Customer: $sce.trustAsHtml("Client: "),
			DeliveryDate: $sce.trustAsHtml("Date de livraison: "),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			BackToResults: $sce.trustAsHtml("Retourner aux r&eacute;sultats"),
			SpecHeader: $sce.trustAsHtml("Sp&eacute;cification"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de s&eacute;rie"),
			ValveDesc: $sce.trustAsHtml("Description de la soupape"),
			ValveQty: $sce.trustAsHtml("Quantit&eacute; de soupape"),
			Size: $sce.trustAsHtml("Dimension"),
			ValveType: $sce.trustAsHtml("Type de soupape"),
			ValveForm: $sce.trustAsHtml("Forme de soupape"),
			BodyRating: $sce.trustAsHtml("Classe de pression"),
			Pressure: $sce.trustAsHtml("Pression"),
			BackPressure: $sce.trustAsHtml("Contre-pression"),
			Temp: $sce.trustAsHtml("Temp&eacute;rature"),
			Inlet: $sce.trustAsHtml("Entr&eacute;e"),
			Outlet: $sce.trustAsHtml("Sortie"),
            POA: "POA"
		}
	};
	var headers = {
		en: {
			PartList: "Parts list for tag number;",
			PartNum: "Part number",
			PartDesc: "Description of part",
			PartQty: "Part quantity",
			ReplSched: "Recommended replacement (yrs)",
			LeadTime: "Lead time (days)",
			Price: "Price per item or set",
			Qty: "Quantity",
			LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
			AddToQuote: "Add to Quote"
		},
		fr: {
			PartList: $sce.trustAsHtml("Liste des pièces pour ce numéro de série"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence"),
			PartDesc: $sce.trustAsHtml("Description de la partie"),
			PartQty: $sce.trustAsHtml("Quantit&eacute; de partie"),
			ReplSched: $sce.trustAsHtml("Remplacement recommand&eacute;e (ans)"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de mise en &oelig;uvre (journées)"),
			Price: $sce.trustAsHtml("Prix par article ou ensemble"),
			Qty: $sce.trustAsHtml("Quantit&eacute;"),
			LeadTimeNotice: $sce.trustAsHtml("D&eacute;lai de livraison pour toutes les commandes sera bas&eacute; sur le plus long d&eacute;lai de la liste des pi&eacute;ces de rechange demand&eacute;es"),
			AddToQuote: $sce.trustAsHtml("Ajouter &agrave; la proposition")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.headers = WeirService.LocaleResources(headers);

	vm.addButtons = [];
	vm.addPartToQuote = function(part, index) {
	    if (!part.Quantity) return;
	    vm.addButtons[index] = true;
		part.xp = typeof part.xp == "undefined" ? {} : part.xp;
		part.xp.SN = vm.tagNumber.Name;
		part.xp.TagNumber = vm.tagNumber.xp.TagNumber;
		WeirService.AddPartToQuote(part)
			.then(function(data) {
				$rootScope.$broadcast('LineItemAddedToCart', data.Order.ID, data.LineItem); //This kicks off an event in cart.js
				part.Quantity = null;
			});
	};
}

function NoResultsController($state, $sce, WeirService, OrderCloud, toastr, Me) {
    var vm = this;
    vm.searchTerm = "";
    vm.info = "";
    vm.locale = WeirService.Locale();
    console.log(Me);
	vm.submitEnquiry = function (form) {
	    var data = {
	        xp: {
	            enquiry: {
	                searchFor: vm.searchTerm,
                    details: vm.info
	            }
	        }
	    };
	    //OrderCloud.Me.Patch(data)
		OrderCloud.Users.Patch(Me.Profile.ID, data, Me.Org.ID)
	        .then(function (usr) {
	            toastr.success(vm.labels.SubmittedMessage);
	            vm.searchTerm = "";
	            vm.info = "";
		        form.$setPristine(true);
	        });
    };
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
            CantFindText2: "Alternatively please complete the simple form below and we will get in touch with you.",
            SerNumPrompt: "Please provide Serial number, or part number or Tag number",
            SparesPrompt: "Please provide details of the spares you require a quote for.",
            Submit: "Submit Enquiry",
            SearchAgain: "Search again",
            YourContact: "Your contact",
            SubmittedMessage: "Your enquiry has been submitted"
        },
        fr: {
            CantFindHeader: $sce.trustAsHtml("Vous n'arrivez pas à trouver ce que vous cherchez?"),
            CantFindText1: $sce.trustAsHtml("Si vous ne trouvez pas ce que vous cherchez, veuillez essayer de nouveau."),
            CantFindText2: $sce.trustAsHtml("Vous pouvez également remplir le formulaire ci-dessous. Nos vous réponderons dans les plus brefs délais."),
            SerNumPrompt: $sce.trustAsHtml("Veuillez fournir un numéro de série, un numéro de pièce ou un numéro de repère soupape."),
            SparesPrompt: $sce.trustAsHtml("Veuillez fournir les détails des pièces de rechange dont vous avez besoin pour une cotation."),
            Submit: $sce.trustAsHtml("Soumettre votre demande"),
            SearchAgain: $sce.trustAsHtml("Nouvelle recherche"),
            YourContact: $sce.trustAsHtml("Votre contact"),
            SubmittedMessage: $sce.trustAsHtml("Votre demande a été soumise")
    }
    };
    vm.labels = WeirService.LocaleResources(labels);
}
