angular.module('orderCloud')
	.directive('ordercloudModalNotice', OrderCloudModalNoticeDirective)
	.controller('ModalNoticeController', ModalNoticeController);

function OrderCloudModalNoticeDirective() {

}

function ModalNoticeController($sce) {
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
	};
	var labels = {
	    en: {
	        SavedMessage: "Quote number has been saved to Your Quotes.",
            ViewQuotesLink: "View Your Quotes"
	    }, fr: {
	        SavedMessage: $sce.trustAsHtml("Le nombre de devis a &eacute;t&eacute; enregistr&eacute; dans l'onglet \"Vos Devis\"."),
	        ViewQuotesLink: $sce.trustAsHtml("Voir vos devis")
	    }
	};
	vm.labels = WeirService.LocaleResources(labels);
}