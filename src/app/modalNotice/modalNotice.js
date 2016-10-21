angular.module('orderCloud')
	.directive('ordercloudModalNotice', OrderCloudModalNoticeDirective)
	.controller('ModalNoticeController', ModalNoticeController);

function OrderCloudModalNoticeDirective() {

}

function ModalNoticeController() {
	var vm = this;

	vm.openModal = function() {
		$uibModal.open({
			animation: true,
			size: undefined,
			restrict: 'E',
			templateUrl: 'modalNotice/templates/modalNotice.tpl.html',
			controller: 'ModalNoticeController',
			controllerAs: 'modalNotice',
			resolve:{
				item: function() {
					return true;
				}
			}
		});
	}
}