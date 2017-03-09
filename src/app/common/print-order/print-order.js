angular.module('orderCloud')
	.controller('printOrderCtrl',PrintOrderController)
	.controller('printOrderBtnCtrl',PrintOrderButtonControl)
	.directive('printOrderButton',PrintOrderButtonDirective);

function PrintOrderController(printData,$timeout,$window,WeirService,$sce) {
	var vm = this;
	// ToDo Get the catalog (UK or FR) and buyer (WVCUIK-1352) data.
	vm.buyer = printData.buyer;
	vm.order = printData.order;
	vm.items = printData.items;
	vm.address = printData.address;
	vm.pocontent = printData.pocontent;
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
			DeliveryAddress: "Delivery Address"
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
			DeliveryAddress: $sce.trustAsHtml("Adresse de livraison")
		}
	};
	vm.labels = labels[WeirService.Locale()];
	$timeout($window.print,1);
}

function PrintOrderButtonControl($scope,imageRoot,WeirService,$uibModal,$sce) {
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
		$uibModal.open({
			animation:true,
			size:'lg',
			templateUrl:templates[WeirService.Locale()],
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