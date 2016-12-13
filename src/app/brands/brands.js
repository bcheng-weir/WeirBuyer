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

function BrandController(Parameters, WeirService, $sce) {
	var vm = this;
	vm.list = [
        'batley-valve',
        'blakeborough',
        'hopkinsons',
        'sarasin-rsbd'
	];
	//use this variable to test in html which brandname using to show hide content messages.
    vm.brand = vm.list[Parameters.brandId];
    var labels = {
        en: {
            Batley: $sce.trustAsHtml("Batley Valve<sup>®</sup>"),
            AboutBatley: $sce.trustAsHtml("Batley Valve<sup>®</sup>"),
            BatleyMsg: $sce.trustAsHtml("Weir manufactures an extensive range of butterfly valves for isolation and control applications under the Batley Valve<sup>®</sup> brand."),
            BatleyTitle: "A leading standard in global process sectors",
            Blakeborough: $sce.trustAsHtml("Blakeborough<sup>®</sup>"),
            AboutBlakeborough: $sce.trustAsHtml("Blakeborough<sup>®</sup>"),
            BlakeboroughTitle: "A leading standard in global process sectors",
            BlakeboroughMsg: $sce.trustAsHtml("The Blakeborough<sup>®</sup> brand has been at the forefront of designing and manufacturing control, choke and steam conditioning valves for more than 70 years."),
            Hopkinsons: $sce.trustAsHtml("Hopkinsons<sup>®</sup>"),
            AboutHopkinsons: $sce.trustAsHtml("Hopkinsons<sup>®</sup>"),
            HopkinsonsTitle: "A leading standard in global process sectors",
            HopkinsonsMsg: $sce.trustAsHtml("Established over 160 years ago, the Hopkinsons<sup>®</sup> brand is renowned for long and dependable service life, generation after generation.")
        },
        fr: {
            SarasinRSBD: $sce.trustAsHtml("Sarasin RSBD<sup>™</sup>"),
            AboutSarasinRSBD: $sce.trustAsHtml("Sarasin-RSBD<sup>™</sup>"),
            SarasinRSBDTitle: $sce.trustAsHtml(""),
            SarasinRSBDMsg: $sce.trustAsHtml("Les soupapes de s&ucirc;ret&eacute; &agrave; ressort et pilot&eacute;es Sarasin-RSBD<sup>™</sup> sont conçues pour garantir des performances, une s&eacute;curit&eacute; et une fiabilit&eacute; optimales.")
        }
    };
    vm.LanguageUsed = WeirService.Locale();
    vm.labels = WeirService.LocaleResources(labels);

    function getBrand(brand) {
        if(brand == 'batley-valve'){
            return {aboutBrand: vm.labels.AboutBatley, pictureMessage: vm.labels.BatleyMsg, Title: vm.labels.BatleyTitle, BrandUsed: vm.labels.Batley };
        }
        if(brand == 'blakeborough'){
            return {aboutBrand: vm.labels.AboutBlakeborough, pictureMessage: vm.labels.BlakeboroughMsg, Title: vm.labels.BlakeboroughTitle, BrandUsed: vm.labels.Blakeborough };
        }
        if(brand == 'hopkinsons'){
            return {aboutBrand: vm.labels.AboutHopkinsons, pictureMessage: vm.labels.HopkinsonsMsg, Title: vm.labels.HopkinsonsTitle, BrandUsed: vm.labels.Hopkinsons };
        }
        if(brand == 'sarasin-rsbd'){
            return {aboutBrand: vm.labels.AboutSarasinRSBD, pictureMessage: vm.labels.SarasinRSBDMsg, Title: vm.labels.SarasinRSBDTitle, BrandUsed: vm.labels.SarasinRSBD };
        }
    }
    vm.brandLabels = getBrand(vm.brand);
}