angular.module('orderCloud')
	.controller('printOrderCtrl',PrintOrderController)
	.controller('printOrderBtnCtrl',PrintOrderButtonControl)
	.directive('printOrderButton',PrintOrderButtonDirective);

function PrintOrderController(printData,$timeout,$window) {
	var vm = this;
	vm.order = printData.order;
	vm.items = printData.items;
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
			items:$scope.items
		};
		$uibModal.open({
			animation:true,
			size:'lg',
			templateUrl:'common/print-order/templates/printorder.tpl.html',
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
			items:'=items'
		},
		templateUrl:'common/print-order/templates/printorderbutton.tpl.html',
		controller:'printOrderBtnCtrl',
		controllerAs:'printbtn'
	}
}