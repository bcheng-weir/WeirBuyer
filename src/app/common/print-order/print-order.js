angular.module('orderCloud')
	.controller('printOrderCtrl',PrintOrderController)
	.controller('printOrderBtnCtrl',PrintOrderButtonControl)
	.directive('printOrderButton',PrintOrderButtonDirective);

function PrintOrderController(printData,$timeout,$window) {
	var vm = this;
	vm.order = printData.order;
	vm.items = printData.items;
	vm.address = printData.address;
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
			order:$scope.order,
			items:$scope.items,
			address:$scope.address
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
			order:'=order',
			items:'=items',
			address:'=address'
		},
		templateUrl:'common/print-order/templates/printorderbutton.tpl.html',
		controller:'printOrderBtnCtrl',
		controllerAs:'printbtn'
	}
}