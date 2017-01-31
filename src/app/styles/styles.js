angular.module('orderCloud')
	.config(StylesConfig)
	.controller('StylesCtrl', StylesController)
;

function StylesConfig($stateProvider) {
	$stateProvider
		.state('styles', {
			parent: 'base',
			url: '/styles',
			templateUrl: 'styles/templates/styles.tpl.html',
			controller: 'StylesCtrl',
			controllerAs: 'styles'
		})
	;
}

function StylesController() {
	var vm = this;
	//This is the styles controller.
}
