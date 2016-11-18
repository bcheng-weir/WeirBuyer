angular.module('orderCloud')
	.config(HomeConfig)
	.controller('HomeCtrl', HomeController)
	.controller('SerialCtrl', SerialController)
	.controller( 'SerialResultsCtrl', SerialResultsController )
	.controller( 'SerialDetailCtrl', SerialDetailController )
	.controller( 'PartCtrl', PartController )
	.controller( 'PartResultsCtrl', PartResultsController )
	.controller( 'TagCtrl', TagController)
	.controller( 'TagResultsCtrl', TagResultsController )
	.controller( 'TagDetailCtrl', TagDetailController )
	.controller( 'NoResultCtrl', NoResultsController )
;

function HomeConfig($stateProvider, $sceDelegateProvider) {
	$sceDelegateProvider.resourceUrlWhitelist([
		'self',
		'https://www.global.weir/brands/**'
	]);
	$stateProvider
		.state('home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home',
			resolve: {
				CurrentCustomer: function(CurrentOrder) {
					return CurrentOrder.GetCurrentCustomer();
				},
				SerialNumbers: function(WeirService, OrderCloud, CurrentOrder) {
					return CurrentOrder.GetCurrentCustomer()
						.then(function(cust) {
					        if (cust) {
					            return OrderCloud.Me.ListCategories(null, 1, 100, null, null, { "catalogID": cust.id});
					        } else {
								return { Items: []};
					    }
					});
				},
				PartNumbers: function(OrderCloud) {
					return OrderCloud.Me.ListProducts(null, 1, 100, null, null, null);
				},
				MyOrg: function(OrderCloud) {
					return OrderCloud.Buyers.Get(OrderCloud.BuyerID.Get());
				}
			}
		})
		.state( 'home.serial', {
			url: '/serial',
			templateUrl: 'home/templates/home.serial.tpl.html',
			controller: 'SerialCtrl',
			controllerAs: 'serial'
		})
		.state( 'home.serial.results', {
			url: '/search?numbers',
			templateUrl: 'home/templates/home.serial.results.tpl.html',
			controller: 'SerialResultsCtrl',
			controllerAs: 'serialResults',
			resolve: {
				SerialNumberResults: function( $stateParams, WeirService ) {
					return WeirService.SerialNumbers($stateParams.numbers.split(','));
				}
			}
		})
		.state( 'home.serial.detail', {
			url: '/:number?:searchNumbers',
			templateUrl: 'home/templates/home.serial.detail.tpl.html',
			controller: 'SerialDetailCtrl',
			controllerAs: 'serialDetail',
			resolve: {
				SerialNumberDetail: function( $stateParams, WeirService ) {
					return WeirService.SerialNumber($stateParams.number);
				}
			}
		})
		.state( 'home.part', {
			url: '/part',
			templateUrl: 'home/templates/home.part.tpl.html',
			controller: 'PartCtrl',
			controllerAs: 'part'
		})
		.state( 'home.part.results', {
			url: '/search?numbers',
			templateUrl: 'home/templates/home.part.results.tpl.html',
			controller: 'PartResultsCtrl',
			controllerAs: 'partResults',
			resolve: {
				PartNumberResults: function( $stateParams, WeirService) {
					return WeirService.PartNumbers($stateParams.numbers.split(','));
				}
			}
		})
		.state( 'home.tag', {
			url: '/tag',
			templateUrl: 'home/templates/home.tag.tpl.html',
			controller: 'TagCtrl',
			controllerAs: 'tag'
		})
		.state( 'home.tag.results', {
			url: '/search?numbers',
			templateUrl: 'home/templates/home.tag.results.tpl.html',
			controller: 'TagResultsCtrl',
			controllerAs: 'tagResults',
			resolve: {
				TagNumberResults: function( $stateParams, WeirService ) {
					return WeirService.TagNumbers($stateParams.numbers.split(','));
				}
			}
		})

		.state( 'home.tag.detail', {
			url: '/:number?:searchNumbers',
			templateUrl: 'home/templates/home.tag.detail.tpl.html',
			controller: 'TagDetailCtrl',
			controllerAs: 'tagDetail',
			resolve: {
				TagNumberDetail: function( $stateParams, WeirService ) {
					return WeirService.TagNumber($stateParams.number);
				}
			}
		})
		.state( 'home.noresults', {
			url: '/noresults',
			templateUrl: 'home/templates/home.noresults.tpl.html',
			controller: 'NoResultCtrl',
			controllerAs: 'noResult'
		});
}

function HomeController($sce, $state, $rootScope, OrderCloud, CurrentOrder, WeirService, CurrentCustomer, SerialNumbers, PartNumbers, MyOrg, imageRoot) {
	var vm = this;
	vm.serialNumberList = SerialNumbers.Items;
	vm.partNumberList = PartNumbers.Items;
	vm.searchType = WeirService.GetLastSearchType();
	vm.IsServiceOrg = (MyOrg.xp.Type.id == 2);
    vm.Customer = CurrentCustomer;
    vm.AvailableCustomers = MyOrg.xp.Customers;

    vm.ImageBaseUrl = imageRoot;
    vm.GetValveImageUrl = function (img) {
        return vm.ImageBaseUrl + "Valves/" + img;
    };

	if (!vm.IsServiceOrg) {
	    if (!vm.Customer || vm.Customer.id != MyOrg.ID) {
	        vm.Customer = {id: MyOrg.ID, name: MyOrg.Name};
	        CurrentOrder.SetCurrentCustomer(vm.Customer)
                .then(function() {
					CurrentOrder.Get();
                })
				.catch(function() {
	                WeirService.FindCart(vm.Customer);
	            });
	    }
	}

	vm.selfsearch = false;
	vm.SelectingCustomer = vm.IsServiceOrg && !vm.Customer;
	vm.customerFilter = null;
	vm.SelectCustomer = function() {
		if (vm.Customer.id == MyOrg.ID) {
		    vm.customerFilter = "";
		    vm.selfsearch = true;
		} else {
		    vm.customerFilter = vm.Customer.name;
		    vm.selfsearch = false;
		}
		vm.SelectingCustomer = true;
	};
	vm.ClearFilter = function() { vm.customerFilter = null; $rootScope.$broadcast('OC:RemoveOrder', null, null); };
	vm.CustomerSelected = function() {
	    var newCust = null;
	    if (vm.selfsearch) {
	        newCust = {id: MyOrg.ID, name: MyOrg.Name};
	    } else {
			for(var i=0; i<vm.AvailableCustomers.length; i++) {
		        if (vm.AvailableCustomers[i].name == vm.customerFilter) {
	                newCust = vm.AvailableCustomers[i];
					break;
		        }
			}
	    }
		if (newCust) {  // && (!vm.Customer || newCust.id != vm.Customer.id) This commented portion prevents a new cart from being started by the same customer. Need to test.
		    vm.Customer = newCust;
		    CurrentOrder.Remove()
			    .then(function() {
				    return CurrentOrder.SetCurrentCustomer(vm.Customer);
			    })
			    .then(function() {
				    vm.serialNumberList.length = 0;
				    WeirService.FindCart(vm.Customer) //This will look for the current DR record. If it can't be found, a DR record is created.
					    .then(function() {
						    OrderCloud.Me.ListCategories(null, 1, 100, null, null, { "catalogID": vm.Customer.id})
							    .then(function(results) {
								    vm.serialNumberList.push.apply(vm.serialNumberList, results.Items);
							    });
					    });
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
			SelectCustomer: "Reset search filter",
			SearchMine: "Search your products",
			SearchOr: "Or",
			FilterEndUser: "Filter by end-user",
			Select: "Select",
			ReplacementGuidance: "Recommended replacement guidance; If ordering 5 year spares you should also order all 2 year spares. If ordering 10 year spares, you should also order all 5 year and 2 year spares.",
			POAGuidance: "POA; You can add POA items to your quote and submit your quote for review. We will respond with a price for the POA items on your quote request.",
			PriceDisclaimer: "All prices stated do not include UK VAT or delivery"
		},
		fr: {
		    SerialSearch: $sce.trustAsHtml("Rechercher par Num&eacute;ro de S&eacute;rie"),
		    PartSearch: $sce.trustAsHtml("Rechercher par R&eacute;f&eacute;rence de Pi&egrave;ce"),
		    TagSearch: $sce.trustAsHtml("Rechercher par Num&eacute;ro de Tag"),
		    CustomerFilter: $sce.trustAsHtml("R&eacute;sultats filtr&eacute;s par: "),
		    SelectCustomer: $sce.trustAsHtml("Renouveler la recherche filtr&eacute;e"),
		    SearchMine: $sce.trustAsHtml("Rechercher votre produit"),
		    SearchOr: $sce.trustAsHtml("Ou"),
		    FilterEndUser: $sce.trustAsHtml("Filtrer par clients finaux"),
		    Select: $sce.trustAsHtml("S&eacute;lectionner"),
		    ReplacementGuidance: $sce.trustAsHtml("TBD: Replacement guidance"),
		    POAGuidance: $sce.trustAsHtml("TBD: POA guidance"),
		    PriceDisclaimer: $sce.trustAsHtml("TBD: Price disclaimer")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
        var searchType = WeirService.GetLastSearchType();
	searchType = searchType || WeirService.SearchType.Serial;
	if($state.current.name == 'home.noresults') $state.go('home.noresults');
	else if (searchType == WeirService.SearchType.Part) {
	    $state.go('home.part');
	} else if (searchType == WeirService.SearchType.Tag) {
	    $state.go('home.tag');
	} else if (searchType == WeirService.SearchType.Serial){
	    $state.go('home.serial');
	}

}

function SerialController(WeirService, $state, $sce, toastr ) {
	var vm = this;
	
	var labels = {
		en: {
			WhereToFind: "where to find your serial number",
			EnterSerial: "Enter Serial Number",
			AddMore: "Add More Serial Numbers   +",
			ClearSearch: "Clear Search",
			Search: "Search"
		},
		fr: {
			WhereToFind: $sce.trustAsHtml("O&ugrave; trouver votre num&eacute;ro de s&eacute;rie"),
			EnterSerial: $sce.trustAsHtml("Entrer le Num&eacute;ro de S&eacute;rie"),
			AddMore: $sce.trustAsHtml("Ajouter plus de Num&eacute;ro de S&eacute;rie   +"),
			ClearSearch: $sce.trustAsHtml("Nouvelle recherche"),
			Search: "Rechercher"
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	WeirService.SetLastSearchType(WeirService.SearchType.Serial);

	vm.serialNumbers = [null];

	vm.addSerialNumber = function() {
		vm.serialNumbers.push(null);
	};

	vm.removeSerialNumber = function(index) {
		vm.serialNumbers.splice(index, 1);
	};

	vm.searchSerialNumbers = function() {
		if(!vm.serialNumbers[0] || vm.serialNumbers.length == 0) {
			toastr.info("Please enter an item in the search box.", "Empty Search");
		} else if (vm.serialNumbers.length == 1) {
			$state.go('home.serial.detail', {number: vm.serialNumbers[0], searchNumbers:  vm.serialNumbers[0]});
		} else {
			$state.go('home.serial.results', {numbers: vm.serialNumbers.join(',')});
		}
	};

	vm.clearSearch = function() {
		vm.serialNumbers = [null];
	};

	vm.showClearSearch = function() {
		var count = 0;
		angular.forEach(vm.serialNumbers, function(number) {
			if (number) count++;
		});
		return count > 0;
	};
	vm.goToArticle = function(article) {
		$state.go('news', {id: article.ID});
	};
}

function SerialResultsController(WeirService, $stateParams, $state, SerialNumberResults, $sce ) {
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
			Customer: "Customer",
			ResultsHeader: "Showing results for serial numbers; " + numFound.toString() + " of " + SerialNumberResults.length.toString() + " searched serial numbers found",
			SerialNumber: "Serial Number",
			TagNumber: "Tag number (if available)",
			ValveDesc: "Valve description",
			NoResultsMsg: "No results found for;",
			SearchAgain: "Search again",
			ViewDetails: "View details"
		},
		fr: {
			Customer: "Client",
			ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les num&eacute;ros de s&eacute;rie: de " + numFound.toString() + " &agrave; " + SerialNumberResults.length.toString() + " num&eacute;ros de s&eacute;rie trouv&eacute;s."),
			SerialNumber: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNumber: $sce.trustAsHtml("Num&eacute;ro de Tag (si disponible)"),
			ValveDesc: "Description de soupape",
			NoResultsMsg: $sce.trustAsHtml("Pas de r&eacute;sultats pour:"),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			ViewDetails: $sce.trustAsHtml("Voir les d&eacute;tails")
		}
	};
	if(numFound == 0) $state.go('home.noresults');
	vm.labels = WeirService.LocaleResources(labels);
}

function SerialDetailController( $stateParams, $rootScope, $state, $sce, WeirService, SerialNumberDetail ) {
	var vm = this;
	vm.serialNumber = SerialNumberDetail;
	vm.searchNumbers = $stateParams.searchNumbers;
	vm.PartQuantity = function(partId) {
		return SerialNumberDetail.xp.Parts[partId];
	};
	if(typeof vm.serialNumber != 'object') {
		$state.go('home.noresults', {}, {reload:true});
	}
	var labels = {
		en: {
			ResultsHeader: "Showing results for serial number; ",
			Tag: "Tag number (if available); ",
			Customer: "Customer; ",
			ManufDate: "Date of valve manufacture; ",
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
			Outlet: "Out"
		},
		fr: {
		    ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les Num&eacute;ros de s&eacute;rie: "),
		    Tag: $sce.trustAsHtml("Num&eacute;ro de Tag (si disponible): "),
			Customer: $sce.trustAsHtml("Client: "),
			ManufDate: $sce.trustAsHtml("Date de fabrication de la soupape: "),
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
			Outlet: $sce.trustAsHtml("Sortie")
		}

	};
	var headers = {
		en: {
			PartList: "Parts list for serial number;",
			PartNum: "Part number",
			PartDesc: "Description of part",
			PartQty: "Part quantity",
			ReplSched: "Recommended replacement",
			LeadTime: "Lead time",
			Price: "Price per item or set",
			Qty: "Quantity",
			LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
			AddToQuote: "Add to Quote"
		},
		fr: {
		    PartList: $sce.trustAsHtml("Liste des pi&eacute;ces pour ce num&eacute;ro de s&eacute;rie"),
		    PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
		    PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
		    PartQty: $sce.trustAsHtml("Quantit&eacute; de pi&egrave;ce"),
		    ReplSched: $sce.trustAsHtml("Remplacement recommand&eacute;"),
		    LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison"),
		    Price: $sce.trustAsHtml("Prix par item ou par kit"),
			Qty: $sce.trustAsHtml("Quantit&eacute;"),
			LeadTimeNotice: $sce.trustAsHtml("Le d&eacute;lai de livraison pour toutes les commandes sera bas&eacute; sur le d&eacute;lai le plus long de la liste des pi&egrave;ces de rechanges demand&eacute;es"),
			AddToQuote: $sce.trustAsHtml("Ajouter &agrave; la cotation")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.headers = WeirService.LocaleResources(headers);

	vm.addPartToQuote = function(part) {
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

function PartController( $state, $sce, WeirService ) {
	var vm = this;

	vm.partNumbers = [null];
	WeirService.SetLastSearchType(WeirService.SearchType.Part);

	vm.addPartNumber = function() {
		vm.partNumbers.push(null);
	};

	vm.removePartNumber = function(index) {
		vm.partNumbers.splice(index, 1);
	};

	vm.searchPartNumbers = function() {
		$state.go('home.part.results', {numbers: vm.partNumbers.join(',')});
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
			Search: "Search"
		},
		fr: {
		    WhereToFind: $sce.trustAsHtml("O&ugrave; trouver vos r&eacute;f&eacute;rences de pi&egrave;ces"),
		    EnterPart: $sce.trustAsHtml("Entrer une r&eacute;f&eacute;rence de pi&egrave;ce"),
		    EnterParts: $sce.trustAsHtml("Entrer plusieurs r&eacute;f&eacute;rences de pi&egrave;ce"),
		    AddMore: $sce.trustAsHtml("Ajouter plus de r&eacute;f&eacute;rences de pi&egrave;ce   "),
			
		    ClearSearch: $sce.trustAsHtml("Nouvelle recherche"),
		    Search: "Rechercher"
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
}

function PartResultsController( $rootScope, $sce, $state, WeirService, PartNumberResults ) {
	var vm = this;
	vm.partNumberResults = PartNumberResults;
	if(vm.partNumberResults == null) $state.go('home.noresults');
	vm.Customer = PartNumberResults.Customer;
	vm.MultipleCustomers = (vm.Customer == "*");
	var numFound = 0;
	angular.forEach(PartNumberResults.Parts, function(entry) {
		if (entry.Detail) numFound++;
	});

	var labels = {
		en: {
			Customer: "Customer",
			ResultsHeader: "Showing results for part numbers; " + numFound.toString() + " of " + PartNumberResults.Parts.length.toString() + " searched part numbers found",
			SearchAgain: "Search again",
			PartNum: "Part number",
			PartDesc: "Description of part",
			ReplSched: "Recommended replacement",
			LeadTime: "Lead time",
			Price: "Price per item or set",
			Qty: "Quantity",
			LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
			AddToQuote: "Add to Quote"
		},
		fr: {
			Customer: "Client",
			ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les r&eacute;f&eacute;rences de pi&egrave;ces: de " + numFound.toString() + " &agrave; " + PartNumberResults.Parts.length.toString() + " r&eacute;f&eacute;rences de pi&egrave;ces trouv&eacute;es."),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&eacute;ce"),
			PartQty: $sce.trustAsHtml("Quantit&eacute; de partie"),
			ReplSched: $sce.trustAsHtml("Remplacement recommand&eacute;"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison"),
			Price: $sce.trustAsHtml("Prix par item ou par kit"),
			Qty: $sce.trustAsHtml("Quantit&eacute;"),
			LeadTimeNotice: $sce.trustAsHtml("Le d&eacute;lai de livraison pour toutes les commandes sera bas&eacute; sur le d&eacute;lai le plus long de la liste des pi&egrave;ces de rechanges demand&eacute;es"),
			AddToQuote: $sce.trustAsHtml("Ajouter &agrave; la cotation")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	if(numFound == 0) $state.go('home.noresults');
	vm.addPartToQuote = function(part) {
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

function TagController(WeirService, $state, $sce, toastr) {
	var vm = this;
	
	var labels = {
		en: {
			// WhereToFind: "where to find your serial number",
			EnterTag: "Enter Tag number",
			AddMore: "Add more tag numbers   +",
			ClearSearch: "Clear Search",
			Search: "Search"
		},
		fr: {
			// WhereToFind: $sce.trustAsHtml("O&ugrave; trouver votre num&eacute;ro de s&eacute;rie"),
		    EnterTag: $sce.trustAsHtml("Entr&eacute;e un num&eacute;ro de tag"),
		    AddMore: $sce.trustAsHtml("Ajouter plus de num&eacute;ro de tag   +"),
		    ClearSearch: $sce.trustAsHtml("Nouvelle recherche"),
		    Search: "Rechercher"
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	WeirService.SetLastSearchType(WeirService.SearchType.Tag);

	vm.tags = [null];

	vm.addTag = function() {
		vm.tags.push(null);
	};

	vm.removeTag = function(index) {
		vm.tags.splice(index, 1);
	};

	vm.searchTags = function() {
		if(!vm.tags[0] || vm.tags.length == 0) {
			toastr.info("Please enter an item in the search box.", "Empty Search");
		} else if (vm.tags.length == 1) {
			$state.go('home.tag.detail', {number: vm.tags[0], searchNumbers: vm.tags[0]});
		}
		else {
			$state.go('home.tag.results', {numbers: vm.tags.join(',')});
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

function TagResultsController(WeirService, $stateParams, $state, TagNumberResults, $sce ) {
	var vm = this;
	vm.tagNumberResults = TagNumberResults;
	vm.searchNumbers = $stateParams.numbers;
	var multiCust = false;
	var cust = "";
	var numFound = 0;
	for(var i=0; i< TagNumberResults.length; i++) {
		var tmp = TagNumberResults[i].Detail;
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
			Customer: "Customer",
			ResultsHeader: "Showing results for tag numbers; " + numFound.toString() + " of " + TagNumberResults.length.toString() + " searched tag numbers found",
			SerialNumber: "Serial Number",
			TagNumber: "Tag number (if available)",
			ValveDesc: "Valve description",
			NoResultsMsg: "No results found for;",
			SearchAgain: "Search again",
			ViewDetails: "View details"
		},
		fr: {
			Customer: "Client",
			ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les Num&eacute;ro de tag : de " + numFound.toString() + " &agrave; " + TagNumberResults.length.toString() + " Num&eacute;ros de tag trouv&eacute;s. "),
			SerialNumber: $sce.trustAsHtml("Num&eacute;ro de s&eacute;rie"),
			TagNumber: $sce.trustAsHtml("Num&eacute;ro de tag (si disponible)"),
			ValveDesc: "Description de la soupape",
			NoResultsMsg: $sce.trustAsHtml("Pas de r&eacute;sultats trouv&eacute;s pour:"),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			ViewDetails: $sce.trustAsHtml("Voir les d&eacute;tails")
		}
	};
	if(numFound == 0) $state.go('home.noresults');
	vm.labels = WeirService.LocaleResources(labels);
}

function TagDetailController( $stateParams, $rootScope, $sce, $state, WeirService, TagNumberDetail ) {
	var vm = this;
	vm.tagNumber = TagNumberDetail;
	vm.searchNumbers = $stateParams.searchNumbers;
	if(typeof vm.tagNumber != 'object') {
		$state.go('home.noresults', {}, {reload:true});
	}
	vm.PartQuantity = function(partId) {
		return TagNumberDetail.xp.Parts[partId];
	};
	var labels = {
		en: {
			ResultsHeader: "Showing results for tag number; ",
			Tag: "Tag number (if available); ",
			Customer: "Customer; ",
			ManufDate: "Date of valve manufacture; ",
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
			Outlet: "Out"
		},
		fr: {
		    ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les num&eacute;ros de tag: "),
			Tag: $sce.trustAsHtml("Num&eacute;ro de Tag (si disponible): "),
			Customer: $sce.trustAsHtml("Client: "),
			ManufDate: $sce.trustAsHtml("Date de fabrication de la soupape: "),
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
			Outlet: $sce.trustAsHtml("Sortie")
		}
	};
	var headers = {
		en: {
			PartList: "Parts list for tag number;",
			PartNum: "Part number",
			PartDesc: "Description of part",
			PartQty: "Part quantity",
			ReplSched: "Recommended replacement",
			LeadTime: "Lead time",
			Price: "Price per item or set",
			Qty: "Quantity",
			LeadTimeNotice: "Lead time for all orders will be based on the longest lead time from the list of spares requested",
			AddToQuote: "Add to Quote"
		},
		fr: {
			PartList: $sce.trustAsHtml("FR: Parts list for tag number"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence"),
			PartDesc: $sce.trustAsHtml("Description de la partie"),
			PartQty: $sce.trustAsHtml("Quantit&eacute; de partie"),
			ReplSched: $sce.trustAsHtml("Remplacement recommand&eacute;e"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de mise en &oelig;uvre"),
			Price: $sce.trustAsHtml("Prix par article ou ensemble"),
			Qty: $sce.trustAsHtml("Quantit&eacute;"),
			LeadTimeNotice: $sce.trustAsHtml("D&eacute;lai de livraison pour toutes les commandes sera bas&eacute; sur le plus long d&eacute;lai de la liste des pi&eacute;ces de rechange demand&eacute;es"),
			AddToQuote: $sce.trustAsHtml("Ajouter &agrave; la proposition")
		}
	};
	vm.labels = WeirService.LocaleResources(labels);
	vm.headers = WeirService.LocaleResources(headers);

	vm.addPartToQuote = function(part) {
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

function NoResultsController($state, $sce, WeirService) {
    var vm = this;
    vm.submitEnquiry = function () {
        console.log("Functioning.");
    };
    vm.searchAgain = function () {
        var searchType = WeirService.GetLastSearchType();
        searchType = searchType || WeirService.SearchType.Serial;
        if (searchType == WeirService.SearchType.Part) {
            $state.go('home.part');
        } else if (searchType == WeirService.SearchType.Tag) {
            $state.go('home.tag');
        } else {
            $state.go('home.serial');
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
            YourContact: "Your contact"
        },
        fr: {
            CantFindHeader: $sce.trustAsHtml("FR: Can't find what you are looking for?"),
            CantFindText1: $sce.trustAsHtml("FR: If you can't find what you are looking for please try searching again"),
            CantFindText2: $sce.trustAsHtml("FR: Alternatively please complete the simple form below and we will get in touch with you."),
            SerNumPrompt: $sce.trustAsHtml("FR: Please provide Serial number, or part number or Tag number"),
            SparesPrompt: $sce.trustAsHtml("FR: Please provide details of the spares you require a quote for."),
            Submit: $sce.trustAsHtml("FR: Submit Enquiry"),
            SearchAgain: $sce.trustAsHtml("FR: Chercher &agrave; nouveau"),
            YourContact: $sce.trustAsHtml("FR: Your contact"),
    }
    };
    vm.labels = WeirService.LocaleResources(labels);
}