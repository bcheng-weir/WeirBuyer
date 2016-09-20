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
			controllerAs: 'serial' //,
			// resolve: {
				// NewsArticles: function(NewsService) {
					// return NewsService.List();
				// }
			//}
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

function HomeController(SerialNumbers, PartNumbers) {
	var vm = this;
	vm.serialNumberList = SerialNumbers.Items;
	vm.partNumberList = PartNumbers.Items;

	vm.formatSerialNumber = function(number) {
		if (!number) return;

		return number.substr(0,3) + '-' + number.substr(3,3) + '/' + number.substr(6,4);
	};
}

function SerialController( $state /*, NewsArticles */ ) {
	var vm = this;
	// vm.newsArticles = NewsArticles;

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

function SerialResultsController( $stateParams, SerialNumberResults ) {
	var vm = this;
	vm.serialNumberResults = SerialNumberResults;
	vm.searchNumbers = $stateParams.numbers;
}

function SerialDetailController( $stateParams, $rootScope, WeirService, SerialNumberDetail ) {
	var vm = this;
	vm.serialNumber = SerialNumberDetail;
	vm.searchNumbers = $stateParams.searchNumbers;

	// vm.addPartToQuote = function(part) {
		// WeirService.AddPartToQuote(part)
				// .then(function(data) {
					// $rootScope.$broadcast('LineItemAddedToCart', data.Order.ID, data.LineItem);
					// part.Quantity = null;
				// });
	// };
}
