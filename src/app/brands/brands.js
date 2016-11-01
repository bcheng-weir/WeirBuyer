angular.module('orderCloud')
	.config(BrandConfig)
	.controller('BrandCtrl',BrandController);

function BrandConfig($stateProvider) {
	$stateProvider
		.state('brands', {
			parent:'base',
			templateUrl:'brands/templates/brands.tpl.html',
			controller:'BrandCtrl',
			controllerAs:'brands',
			url:'/brands/:brandId',
			resolve: {
				Parameters: function($stateParams,OrderCloudParameters) {
					return OrderCloudParameters.Get($stateParams);
				}
			}
		})
}

function BrandController(Parameters) {
	var vm = this;
	vm.list = [
		'https://www.global.weir/brands/batley-valve/',
		'https://www.global.weir/brands/blakeborough/',
		'https://www.global.weir/brands/hopkinsons/',
		'https://www.global.weir/brands/sarasin-rsbd'
	];

	vm.brand = vm.list[Parameters.brandId];
}