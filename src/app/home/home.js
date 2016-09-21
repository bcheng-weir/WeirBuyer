angular.module('orderCloud')
	.config(HomeConfig)
	.controller('HomeCtrl', HomeController)
	.controller('SerialCtrl', SerialController)
	.controller( 'SerialResultsCtrl', SerialResultsController )
	.controller( 'SerialDetailCtrl', SerialDetailController )
;

function HomeConfig($stateProvider) {
	$stateProvider
		.state('home', {
			parent: 'base',
			url: '/home',
			templateUrl: 'home/templates/home.tpl.html',
			controller: 'HomeCtrl',
			controllerAs: 'home',
			resolve: {
				SerialNumbers: function(OrderCloud) {
					return OrderCloud.Me.ListCategories(null, 1, 100);
				},
				PartNumbers: function(OrderCloud) {
					return OrderCloud.Me.ListProducts(null, 1, 100);
				}
			}
		})
		.state( 'home.serial', {
			url: '/serial',
			templateUrl: 'home/templates/home.serial.tpl.html',
			controller: 'SerialCtrl',
			controllerAs: 'serial',
			resolve: {
				NewsArticles: function() { return []; }
				// NewsArticles: function(NewsService) {
					// return NewsService.List();
				// }
			}
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

	;
}

function HomeController(WeirService, SerialNumbers, PartNumbers, $sce) {
	var vm = this;
	vm.serialNumberList = SerialNumbers.Items;
	vm.partNumberList = PartNumbers.Items;

	vm.formatSerialNumber = function(number) {
		if (!number) return;

		return number.substr(0,3) + '-' + number.substr(3,3) + '/' + number.substr(6,4);
	};
	var labels = {
		en: {
			SerialSearch: "Search by serial number",
			PartSearch: "Search by part number",
			TagSearch: "Search by Tag number"
		},
		fr: {
			SerialSearch: $sce.trustAsHtml("Recherche par num&eacute;ro de s&eacute;rie"),
			PartSearch: $sce.trustAsHtml("Recherche par num&eacute;ro de pi&eacute;ce"),
			TagSearch: $sce.trustAsHtml("Recherche par num&eacute;ro de tag")
		}
	};
	switch (WeirService.Locale()) {
		case 'fr':
			vm.labels = labels.fr;
			break;
		default:
			vm.labels = labels.en;
			break;
	}
}

function SerialController(WeirService, $state, $sce /*, NewsArticles */ ) {
	var vm = this;
	// vm.newsArticles = NewsArticles;
	
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
			EnterSerial: $sce.trustAsHtml("Entrer le num&eacute;ro de s&eacute;rie"),
			AddMore: $sce.trustAsHtml("Ajouter des num&eacute;ros plus s&eacute;rie   +"),
			ClearSearch: $sce.trustAsHtml("Effacer la recherche"),
			Search: "Chercher"
		}
	};
	switch (WeirService.Locale()) {
		case 'fr':
			vm.labels = labels.fr;
			break;
		default:
			vm.labels = labels.en;
			break;
	}

	vm.serialNumbers = [null];

	vm.addSerialNumber = function() {
		vm.serialNumbers.push(null);
	};

	vm.removeSerialNumber = function(index) {
		vm.serialNumbers.splice(index, 1);
	};

	vm.searchSerialNumbers = function() {
		if (vm.serialNumbers.length == 1) {
			$state.go('home.serial.detail', {number: vm.serialNumbers[0]});
		}
		else {
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

function SerialResultsController(WeirService, $stateParams, SerialNumberResults, $sce ) {
	var vm = this;
	vm.serialNumberResults = SerialNumberResults;
	vm.searchNumbers = $stateParams.numbers;
	var labels = {
		en: {
			Customer: "Customer",
			ResultsHeader: "Showing results for serial numbers;",
			SerialNumber: "Serial Number",
			TagNumber: "Tag number (if available)",
			ValveDesc: "Valve description",
			NoResultsMsg: "No results found for;",
			SearchAgain: "Search again",
			ViewDetails: "View details"
		},
		fr: {
			Customer: "Client",
			ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour les num&eacute;ros de &eacute;rie;"),
			SerialNumber: $sce.trustAsHtml("Num&eacute;ro de s&eacute;rie"),
			TagNumber: $sce.trustAsHtml("Num&eacute;ro de tag (si disponible)"),
			ValveDesc: "Description de soupape",
			NoResultsMsg: $sce.trustAsHtml("Aucun r&eacute;sultat pour;"),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			ViewDetails: $sce.trustAsHtml("Voir les d&eacute;tails")
		}
	};
	switch (WeirService.Locale()) {
		case 'fr':
			vm.labels = labels.fr;
			break;
		default:
			vm.labels = labels.en;
			break;
	}
}

function SerialDetailController( $stateParams, $rootScope, $sce, WeirService, SerialNumberDetail ) {
	var vm = this;
	vm.serialNumber = SerialNumberDetail;
	vm.searchNumbers = $stateParams.searchNumbers;

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
			ResultsHeader: $sce.trustAsHtml("Affichage des r&eacute;sultats pour le num&eacute;ro de s&eacute;rie; "),
			Tag: $sce.trustAsHtml("Num&eacute;ro d'identification (si disponible); "),
			Customer: $sce.trustAsHtml("Client; "),
			ManufDate: $sce.trustAsHtml("La date de fabrication de la valve; "),
			SearchAgain: $sce.trustAsHtml("Chercher &agrave; nouveau"),
			BackToResults: $sce.trustAsHtml("Retour aux r&eacute;sultats"),
			SpecHeader: $sce.trustAsHtml("Sp&eacute;cification"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de s&eacute;rie"),
			ValveDesc: $sce.trustAsHtml("Description de la vanne"),
			ValveQty: $sce.trustAsHtml("La quantit&eacute; de vanne"),
			Size: $sce.trustAsHtml("Taille"),
			ValveType: $sce.trustAsHtml("Type de vanne"),
			ValveForm: $sce.trustAsHtml("Sous forme de Valve"),
			BodyRating: $sce.trustAsHtml("Note du corps"),
			Pressure: $sce.trustAsHtml("Pression"),
			BackPressure: $sce.trustAsHtml("Retour Pression"),
			Temp: $sce.trustAsHtml("Temp&eacute;rature"),
			Inlet: $sce.trustAsHtml("Dans"),
			Outlet: $sce.trustAsHtml("En dehors")
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
			PartList: $sce.trustAsHtml("Liste des pi&eacute;ces pour le num&eacute;ro de s&eacute;rie;"),
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
	switch (WeirService.Locale()) {
		case 'fr':
			vm.labels = labels.fr;
			vm.headers = headers.fr;
			break;
		default:
			vm.labels = labels.en;
			vm.headers = headers.en;
			break;
	}

	// vm.addPartToQuote = function(part) {
		// WeirService.AddPartToQuote(part)
				// .then(function(data) {
					// $rootScope.$broadcast('LineItemAddedToCart', data.Order.ID, data.LineItem);
					// part.Quantity = null;
				// });
	// };
}
