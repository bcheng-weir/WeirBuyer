angular.module('orderCloud')
	.controller('printOrderCtrl',PrintOrderController)
	.controller('printOrderBtnCtrl',PrintOrderButtonControl)
	.directive('printOrderButton',PrintOrderButtonDirective);

function PrintOrderController(printData,$timeout,$window,WeirService) {
	var vm = this;
	// ToDo Get the catalog (UK or FR) and buyer (WVCUIK-1352) data.
	vm.buyer = printData.buyer;
	vm.order = printData.order;
	vm.items = printData.items;
	vm.address = printData.address;
	vm.pocontent = printData.pocontent;
	var labels = {
		en: {},
		fr: {}
	};
	vm.labels = labels[WeirService.Locale()];
	$timeout($window.print,1);
}

function PrintOrderButtonControl($scope,imageRoot,WeirService,$uibModal) {
	var vm = this;
	var labels = {
		en: {
			print:'Print'
		},
		fr: {
			print:'Print'
		}
	};
	vm.labels = labels[WeirService.Locale()];
	vm.GetImageUrl = function(img) {
		return imageRoot + img;
	};

	vm.Print = function() {
		var printData = {
			buyer:$scope.buyer,
			order:$scope.order,
			items:$scope.items,
			address:$scope.address,
			pocontent:$scope.pocontent
		};
		var templates = {
			en:'common/print-order/templates/printorder.tpl.html',
			fr:'common/print-order/templates/printorderfr.tpl.html'
		};
		$uibModal.open({
			animation:true,
			size:'lg',
			templateUrl:templates[WeirService.Locale()],
			controller:'printOrderCtrl',
			controllerAs:'printctrl',
			resolve: {
				printData:printData
			}
		});
	}
}

function PrintOrderButtonDirective () {
	return {
		restrict:'E',
		scope:{
			buyer:'=buyer',
			order:'=order',
			items:'=items',
			address:'=address',
			pocontent:'=pocontent'
		},
		templateUrl:'common/print-order/templates/printorderbutton.tpl.html',
		controller:'printOrderBtnCtrl',
		controllerAs:'printbtn'
	}
}