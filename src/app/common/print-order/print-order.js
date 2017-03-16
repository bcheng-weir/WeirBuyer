angular.module('orderCloud')
	.controller('printOrderCtrl',PrintOrderController)
	.controller('printOrderBtnCtrl',PrintOrderButtonControl)
	.directive('printOrderButton',PrintOrderButtonDirective);

function PrintOrderController(printData,$timeout,$window,WeirService,$sce) {
	var vm = this;
	// ToDo Get the catalog (UK or FR) and buyer (WVCUIK-1352) data.
	vm.catalog = printData.catalog;
	vm.buyer = printData.buyer;
	vm.order = printData.order;
	vm.items = printData.items;
	vm.address = printData.address;
	vm.pocontent = printData.pocontent;
	vm.CarriageRateForBuyer = vm.buyer.xp.UseCustomCarriageRate == true ? vm.buyer.xp.CustomCarriageRate : vm.catalog.xp.StandardCarriage;
	vm.CarriageRateForBuyer = vm.CarriageRateForBuyer.toFixed(2);
	vm.SetCarriageLabelInTable = function(language){
		if(language == 'en') {
			if (vm.order.xp.CarriageRateType) {
				if (vm.order.xp.CarriageRateType == 'standard') {
					return 'Carriage Charge';
				}
				else return 'Carriage - Ex Works'
			}
			else return "";
		}
		else{
			if (vm.order.xp.CarriageRateType) {
				if (vm.order.xp.CarriageRateType == 'standard') {
					return 'FR: Carriage Charge';
				}
				else return 'FR: Carriage - Ex Works'
			}
			else return "";
		}
	};
	var labels = {
		en: {
			QuoteNumber: "Quote Number; ",
			YourReference: "Your Reference No; ",
			PONumber: "PO Number;",
			SerialNum: "Serial Number",
			TagNum: "Tag Number (if available)",
			PartNum: "Part Number",
			PartDesc: "Description of Part",
			RecRepl: "Recommended Replacement (yrs)",
			LeadTime: "Lead Time (days)",
			PricePer: "Price per Item or Set",
			Quantity: "Quantity",
			Total: "Total",
			DeliveryAddress: "Delivery Address",
			POAShipping: "POA",
			DescriptionOfShipping: vm.SetCarriageLabelInTable('en')
		},
		fr: {
			QuoteNumber: $sce.trustAsHtml("Num&eacute;ro de cotation "),
			YourReference: $sce.trustAsHtml("Votre num&eacute;ro de r&eacute;f&eacute;rence; "),
			PONumber: $sce.trustAsHtml("Numéro de bon de commande;"),
			SerialNum: $sce.trustAsHtml("Num&eacute;ro de S&eacute;rie"),
			TagNum: $sce.trustAsHtml("Numéro de repère soupape"),
			PartNum: $sce.trustAsHtml("R&eacute;f&eacute;rence de la pi&egrave;ce"),
			PartDesc: $sce.trustAsHtml("Description de la pi&egrave;ce"),
			RecRepl: $sce.trustAsHtml("Remplacement recommand&eacute; (ans)"),
			LeadTime: $sce.trustAsHtml("D&eacute;lai de livraison (journées)"),
			PricePer: $sce.trustAsHtml("Prix par item ou par kit"),
			Quantity: $sce.trustAsHtml("Quantit&eacute;"),
			Total: $sce.trustAsHtml("Total"),
			DeliveryAddress: $sce.trustAsHtml("Adresse de livraison"),
			POAShipping: "POA",
			DescriptionOfShipping: vm.SetCarriageLabelInTable('fr')
		}
	};
	vm.labels = labels[WeirService.Locale()];
	$timeout($window.print,1);
}

function PrintOrderButtonControl($scope,imageRoot,WeirService,$uibModal,$sce,$document) {
	var vm = this;
	var labels = {
		en: {
			print:'Print'
		},
		fr: {
			print: $sce.trustAsHtml("Imprimer")
		}
	};
	vm.labels = labels[WeirService.Locale()];
	vm.GetImageUrl = function(img) {
		return imageRoot + img;
	};

	vm.Print = function() {
		var printData = {
			catalog:$scope.catalog,
			buyer:$scope.buyer,
			order:$scope.order,
			items:$scope.items,
			address:$scope.address,
			pocontent:$scope.pocontent
		};
		var templates = {
			en:'common/print-order/templates/printorder.tpl.html',
			fr:'common/print-order/templates/printorderfr.tpl.html'
		};
		var parentElem = angular.element($document[0].querySelector('body'));
		$uibModal.open({
			animation:true,
			size:'lg',
			templateUrl:templates[WeirService.Locale()],
			controller:'printOrderCtrl',
			controllerAs:'printctrl',
			appendTo: parentElem,
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
			catalog:'=catalog',
			buyer:'=buyer',
			order:'=order',
			items:'=items',
			address:'=address',
			pocontent:'=pocontent'
		},
		templateUrl:'common/print-order/templates/printorderbutton.tpl.html',
		controller:'printOrderBtnCtrl',
		controllerAs:'printbtn'
	}
}