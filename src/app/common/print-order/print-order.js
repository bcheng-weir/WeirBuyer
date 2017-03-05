angular.module('orderCloud')
	.controller('printOrderCtrl',PrintOrderController)
	.controller('printOrderBtnCtrl',PrintOrderButtonControl)
	.directive('printOrderButton',PrintOrderButtonDirective);

function PrintOrderController(order) {
	var vm = this;
	console.log(order.name);
}

function PrintOrderButtonControl(imageRoot,WeirService,$uibModal) {
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
		console.log("Printing...");
		// TODO Launch the Modal Print Form.
		$uibModal.open({
			animation:true,
			size:'lg',
			templateUrl:'common/print-order/templates/printorder.tpl.html',
			controller:'printOrderCtrl',
			controllerAs:'printctrl',
			resolve: {
				order:{name:'put the order here.'}
			}
		});
	}
}

function PrintOrderButtonDirective () {
	return {
		restrict:'E',
		scope:{},
		templateUrl:'common/print-order/templates/printorderbutton.tpl.html',
		controller:'printOrderBtnCtrl',
		controllerAs:'printbtn'
	}
}