angular.module('orderCloud')
	.controller('printOrderCtrl',PrintOrderController)
	.controller('printOrderBtnCtrl',PrintOrderButtonControl)
	.directive('printOrderButton',PrintOrderButtonDirective);

function PrintOrderController(order) {
	var vm = this;
	console.log(order.ID);
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
		console.log($scope.order.ID);
		// TODO Launch the Modal Print Form.
		$uibModal.open({
			animation:true,
			size:'lg',
			templateUrl:'common/print-order/templates/printorder.tpl.html',
			controller:'printOrderCtrl',
			controllerAs:'printctrl',
			resolve: {
				order:$scope.order
			}
		});
	}
}

function PrintOrderButtonDirective () {
	return {
		restrict:'E',
		scope:{
			order:'=order'
		},
		templateUrl:'common/print-order/templates/printorderbutton.tpl.html',
		controller:'printOrderBtnCtrl',
		controllerAs:'printbtn'
	}
}