angular.module('orderCloud')
	.directive('ordercloudModalNotice', OrderCloudModalNoticeDirective)
	.controller('ModalNoticeController', ModalNoticeController);

function OrderCloudModalNoticeDirective() {

}

function ModalNoticeController() {
	var vm = this;

	vm.openModal = function(WeirService, $sce) {
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
	var labels = {
	    en: {
	        SavedMessage: "Quote number has been saved to Your Quotes.",
            ViewQuotesLink: "View Your Quotes"
	    }, fr: {
	        SavedMessage: $sce.trustAsHtml("FR: Quote number has been saved to Your Quotes."),
	        ViewQuotesLink: $sce.trustAsHtml("FR: View Your Quotes")
	    }
	};
	vm.labels = WeirService.LocaleResources(labels);
}